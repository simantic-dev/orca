import { open, readdir, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ToolProcessRunner } from '../hardware-tools/tool-version-probe'
import {
  KICAD_GLB_MAX_BYTES,
  KICAD_SVG_MAX_BYTES,
  type KicadArtifactChunk,
  type KicadArtifactMime,
  type KicadArtifactRef,
  type KicadPcbLayersRenderResult,
  type KicadPcbModelDetail,
  type KicadPcbModelExportResult,
  type KicadSchematicPage,
  type KicadSchematicRenderResult
} from '../../shared/kicad-viewer-contract'
import { KicadArtifactRegistry } from './kicad-artifact-registry'
import { KicadError } from './kicad-errors'
import {
  layersCacheKey,
  pcbGlbExportArgs,
  pcbLayersSvgExportArgs,
  schematicSvgExportArgs
} from './kicad-export-commands'
import { readKicadPcbLayers } from './kicad-pcb-layers'
import type { KicadProject } from './kicad-project-resolution'
import {
  evictSiblingStamps,
  kicadProjectCacheDir,
  kicadStampDir,
  produceStampDir,
  produceStampFile,
  pruneKicadRenderCache,
  touchLastAccess
} from './kicad-render-cache'
import { pcbSourceStamp, schematicSourceStamp } from './kicad-source-stamp'

export type KicadRenderServiceHost = {
  cacheRoot: string
  run: ToolProcessRunner
  /** The kicad-cli binary to spawn; rejects with a `KicadError` when none is usable. */
  resolveCli: () => Promise<{ binaryPath: string; env?: NodeJS.ProcessEnv }>
  limits?: { svgMaxBytes?: number; glbMaxBytes?: number }
}

const SCHEMATIC_TIMEOUT_MS = 60_000
const PCB_SVG_TIMEOUT_MS = 120_000
const GLB_TIMEOUT_MS = 300_000
const EXPORT_OUTPUT_CAP_BYTES = 1024 * 1024
const STDERR_TAIL_CHARS = 2000

export class KicadRenderService {
  private readonly registry = new KicadArtifactRegistry()
  private readonly inFlight = new Map<string, Promise<unknown>>()
  private pruned: Promise<void> | null = null

  constructor(private readonly host: KicadRenderServiceHost) {}

  async renderSchematic(
    project: KicadProject,
    options: { force?: boolean } = {}
  ): Promise<KicadSchematicRenderResult> {
    const projectDir = await this.prepareProject(project)
    const stamp = await schematicSourceStamp(project.sheetPaths)
    const dir = kicadStampDir(projectDir, 'sch', stamp)
    if (options.force) {
      await rm(dir, { recursive: true, force: true })
      this.registry.forgetUnder(dir)
    }
    const { cached } = await this.dedupe(dir, () =>
      produceStampDir(dir, (tmpDir) =>
        this.runExport(
          schematicSvgExportArgs(project.schPath, tmpDir),
          project.dir,
          SCHEMATIC_TIMEOUT_MS,
          async () => (await readdir(tmpDir)).some((name) => name.endsWith('.svg'))
        )
      )
    )
    await this.evict(projectDir, 'sch', stamp)
    const pages = await this.schematicPages(project, dir)
    return { stamp, cached, pages }
  }

  async renderPcbLayers(
    project: KicadProject,
    options: { layers: readonly string[]; mirror?: boolean; force?: boolean }
  ): Promise<KicadPcbLayersRenderResult> {
    const pcbPath = requirePcb(project)
    const projectDir = await this.prepareProject(project)
    const stamp = await pcbSourceStamp(pcbPath)
    const dir = kicadStampDir(projectDir, 'pcb', stamp)
    const mirror = options.mirror === true
    const fileName = `${layersCacheKey(options.layers, mirror)}.svg`
    const artifactPath = join(dir, fileName)
    if (options.force) {
      await rm(artifactPath, { force: true })
    }
    const { path, cached } = await this.dedupe(artifactPath, () =>
      produceStampFile(dir, fileName, (tmpFile) =>
        this.runExport(
          pcbLayersSvgExportArgs(pcbPath, tmpFile, options.layers, mirror),
          project.dir,
          PCB_SVG_TIMEOUT_MS,
          () => fileHasBytes(tmpFile)
        )
      )
    )
    await this.evict(projectDir, 'pcb', stamp)
    const [layers, artifact] = await Promise.all([
      readKicadPcbLayers(pcbPath),
      this.registerArtifact(
        path,
        'image/svg+xml',
        this.host.limits?.svgMaxBytes ?? KICAD_SVG_MAX_BYTES
      )
    ])
    return { stamp, cached, layers, artifact }
  }

  async exportPcbModel(
    project: KicadProject,
    options: { detail?: KicadPcbModelDetail; force?: boolean } = {}
  ): Promise<KicadPcbModelExportResult> {
    const pcbPath = requirePcb(project)
    const projectDir = await this.prepareProject(project)
    const stamp = await pcbSourceStamp(pcbPath)
    const dir = kicadStampDir(projectDir, 'pcb', stamp)
    const detail = options.detail ?? 'full'
    const fileName = `board-${detail}.glb`
    const artifactPath = join(dir, fileName)
    if (options.force) {
      await rm(artifactPath, { force: true })
    }
    const { path, cached } = await this.dedupe(artifactPath, () =>
      produceStampFile(dir, fileName, (tmpFile) =>
        this.runExport(
          pcbGlbExportArgs(pcbPath, tmpFile, detail),
          project.dir,
          GLB_TIMEOUT_MS,
          () => fileHasBytes(tmpFile)
        )
      )
    )
    await this.evict(projectDir, 'pcb', stamp)
    const artifact = await this.registerArtifact(
      path,
      'model/gltf-binary',
      this.host.limits?.glbMaxBytes ?? KICAD_GLB_MAX_BYTES
    )
    return { stamp, cached, detail, artifact }
  }

  async readArtifactChunk(
    artifactId: string,
    offset: number,
    length: number
  ): Promise<KicadArtifactChunk> {
    const record = this.registry.resolve(artifactId)
    if (!record) {
      throw new KicadError('kicad_artifact_not_found')
    }
    const handle = await open(record.path, 'r')
    try {
      const buffer = Buffer.alloc(length)
      const { bytesRead } = await handle.read(buffer, 0, length, offset)
      return {
        contentBase64: buffer.subarray(0, bytesRead).toString('base64'),
        bytesRead,
        eof: offset + bytesRead >= record.byteLength
      }
    } finally {
      await handle.close()
    }
  }

  private async prepareProject(project: KicadProject): Promise<string> {
    // Why: one prune per app run keeps startup cheap while still bounding the cache over months.
    this.pruned ??= pruneKicadRenderCache(this.host.cacheRoot).then(() => undefined)
    await this.pruned
    const projectDir = kicadProjectCacheDir(this.host.cacheRoot, project.proPath)
    await touchLastAccess(projectDir)
    return projectDir
  }

  private async evict(projectDir: string, view: 'sch' | 'pcb', keepStamp: string): Promise<void> {
    for (const removed of await evictSiblingStamps(projectDir, view, keepStamp)) {
      this.registry.forgetUnder(removed)
    }
  }

  private dedupe<T>(key: string, work: () => Promise<T>): Promise<T> {
    const running = this.inFlight.get(key)
    if (running) {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the key is the artifact path, so every caller sharing it awaits the same export and result shape.
      return running as Promise<T>
    }
    const promise = work().finally(() => {
      this.inFlight.delete(key)
    })
    this.inFlight.set(key, promise)
    return promise
  }

  /**
   * Runs one export. kicad-cli exits non-zero when a footprint's 3D model is missing yet still
   * writes the file, so a produced output wins over the exit code; only a missing output fails.
   */
  private async runExport(
    args: string[],
    cwd: string,
    timeoutMs: number,
    produced: () => Promise<boolean>
  ): Promise<void> {
    const cli = await this.host.resolveCli()
    const result = await this.host.run({
      program: cli.binaryPath,
      args,
      cwd,
      ...(cli.env ? { env: cli.env } : {}),
      timeoutMs,
      maxOutputBytes: EXPORT_OUTPUT_CAP_BYTES
    })
    const stderrTail = result.stderr.slice(-STDERR_TAIL_CHARS)
    if (result.timedOut) {
      throw new KicadError('kicad_export_failed', `kicad-cli timed out after ${timeoutMs}ms`, {
        stderrTail
      })
    }
    if (result.code !== 0 && !(await produced())) {
      throw new KicadError('kicad_export_failed', `kicad-cli exited with code ${result.code}`, {
        stderrTail
      })
    }
  }

  private async registerArtifact(
    path: string,
    mime: KicadArtifactMime,
    maxBytes: number
  ): Promise<KicadArtifactRef> {
    const { size } = await stat(path)
    if (size > maxBytes) {
      throw new KicadError('kicad_artifact_too_large', `${basename(path)} is ${size} bytes`, {
        byteLength: size,
        maxBytes
      })
    }
    return this.registry.register(path, size, mime)
  }

  private async schematicPages(project: KicadProject, dir: string): Promise<KicadSchematicPage[]> {
    const stem = basename(project.schPath, '.kicad_sch')
    const files = (await readdir(dir)).filter((name) => name.endsWith('.svg'))
    const pages: KicadSchematicPage[] = []
    for (const file of files) {
      const artifact = await this.registerArtifact(
        join(dir, file),
        'image/svg+xml',
        this.host.limits?.svgMaxBytes ?? KICAD_SVG_MAX_BYTES
      )
      const pageStem = basename(file, '.svg')
      const isRoot = pageStem === stem
      const sheet = pageStem.startsWith(`${stem}-`) ? pageStem.slice(stem.length + 1) : pageStem
      pages.push({ id: isRoot ? 'root' : sheet, label: isRoot ? project.name : sheet, artifact })
    }
    return pages.sort((a, b) =>
      a.id === 'root' ? -1 : b.id === 'root' ? 1 : a.label.localeCompare(b.label)
    )
  }
}

async function fileHasBytes(path: string): Promise<boolean> {
  try {
    return (await stat(path)).size > 0
  } catch {
    return false
  }
}

function requirePcb(project: KicadProject): string {
  if (!project.pcbPath) {
    throw new KicadError('kicad_pcb_missing', `${project.name} has no .kicad_pcb`)
  }
  return project.pcbPath
}
