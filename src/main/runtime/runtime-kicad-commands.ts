import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { GlobalSettings } from '../../shared/global-settings-types'
import type {
  KicadArtifactChunk,
  KicadCliAvailability,
  KicadPcbLayersRenderResult,
  KicadPcbModelDetail,
  KicadPcbModelExportResult,
  KicadProjectInfo,
  KicadProjectListing,
  KicadSchematicRenderResult
} from '../../shared/kicad-viewer-contract'
import { runProcess } from '../../shared/child-process/run-process'
import { discoverKicadCli } from '../kicad/kicad-cli-discovery'
import { KicadError } from '../kicad/kicad-errors'
import { resolveKicadProject, type KicadProject } from '../kicad/kicad-project-resolution'
import { kicadRenderCacheRoot } from '../kicad/kicad-render-cache'
import { kicadModelLibraryEnv } from '../kicad/kicad-model-library-env'
import { KicadRenderService } from '../kicad/kicad-render-service'
import { listKicadProjects } from '../kicad/list-kicad-projects'
import { requireLocalExecutionHost } from '../hardware-tools/local-execution-host-gate'
import type { ResolvedRuntimeFileTarget } from './runtime-file-command-target'
import { joinWorktreeRelativePath, normalizeRuntimeRelativePath } from './runtime-relative-paths'

export type RuntimeKicadCommandHost = {
  getSettings(): Pick<GlobalSettings, 'kicadCliPath'>
  resolveRuntimeFileTarget(selector: string): Promise<ResolvedRuntimeFileTarget>
  getUserDataPath(): string
  /** The login-shell environment, so PATH matches what the user's terminal sees. */
  getProcessEnv(): Promise<NodeJS.ProcessEnv>
  /** Test seam; production spawns kicad-cli through `runProcess`. */
  createRenderService?: (
    resolveCli: () => Promise<{ binaryPath: string; env: NodeJS.ProcessEnv }>
  ) => KicadRenderService
}

const AVAILABILITY_TTL_MS = 60_000
const REMOTE_UNSUPPORTED = 'kicad_remote_host_unsupported'

type CachedAvailability = { key: string; at: number; value: Promise<KicadCliAvailability> }

type ProjectParams = { worktree: string; relativePath: string }

export class RuntimeKicadCommands {
  private availability: CachedAvailability | null = null
  private renderService: KicadRenderService | null = null

  constructor(private readonly host: RuntimeKicadCommandHost) {}

  async kicadAvailability(
    params: { worktree?: string; refresh?: boolean } = {}
  ): Promise<KicadCliAvailability> {
    if (params.worktree) {
      await this.resolveLocalTarget(params.worktree)
    }
    return this.resolveAvailability(params.refresh === true)
  }

  async kicadListProjects(params: {
    worktree: string
  }): Promise<{ projects: KicadProjectListing[] }> {
    const target = await this.resolveLocalTarget(params.worktree)
    return { projects: await listKicadProjects(target.worktree.path) }
  }

  async kicadResolveProject(params: ProjectParams): Promise<KicadProjectInfo> {
    const { project, root } = await this.resolveProject(params)
    return {
      name: project.name,
      proRelativePath: relativeTo(root, project.proPath),
      dirRelativePath: relativeTo(root, project.dir),
      hasPcb: project.pcbPath !== null,
      sheetCount: project.sheetPaths.length
    }
  }

  async kicadRenderSchematic(
    params: ProjectParams & { force?: boolean }
  ): Promise<KicadSchematicRenderResult> {
    const { project } = await this.resolveProject(params)
    return this.renderer().renderSchematic(project, { force: params.force === true })
  }

  async kicadRenderPcbLayers(
    params: ProjectParams & { layers: string[]; mirror?: boolean; force?: boolean }
  ): Promise<KicadPcbLayersRenderResult> {
    const { project } = await this.resolveProject(params)
    return this.renderer().renderPcbLayers(project, {
      layers: params.layers,
      mirror: params.mirror === true,
      force: params.force === true
    })
  }

  async kicadExportPcbModel(
    params: ProjectParams & { detail?: KicadPcbModelDetail; force?: boolean }
  ): Promise<KicadPcbModelExportResult> {
    const { project } = await this.resolveProject(params)
    return this.renderer().exportPcbModel(project, {
      detail: params.detail ?? 'full',
      force: params.force === true
    })
  }

  async kicadReadArtifact(params: {
    artifactId: string
    offset: number
    length: number
  }): Promise<KicadArtifactChunk> {
    return this.renderer().readArtifactChunk(params.artifactId, params.offset, params.length)
  }

  private async resolveLocalTarget(worktree: string): Promise<ResolvedRuntimeFileTarget> {
    const target = await this.host.resolveRuntimeFileTarget(worktree)
    requireLocalExecutionHost(target, REMOTE_UNSUPPORTED)
    return target
  }

  private async resolveProject(
    params: ProjectParams
  ): Promise<{ project: KicadProject; root: string }> {
    const target = await this.resolveLocalTarget(params.worktree)
    const root = target.worktree.path
    const projectPath = joinWorktreeRelativePath(
      root,
      normalizeRuntimeRelativePath(params.relativePath)
    )
    if (!isInside(root, projectPath)) {
      throw new KicadError(
        'kicad_project_not_found',
        `${params.relativePath} is outside the workspace`
      )
    }
    return { project: await resolveKicadProject(projectPath), root }
  }

  private renderer(): KicadRenderService {
    if (!this.renderService) {
      const resolveCli = async (): Promise<{ binaryPath: string; env: NodeJS.ProcessEnv }> => {
        const availability = await this.resolveAvailability(false)
        if (availability.status === 'found') {
          const env = await this.host.getProcessEnv()
          return {
            binaryPath: availability.binaryPath,
            env: {
              ...env,
              ...kicadModelLibraryEnv(availability.binaryPath, availability.major, env)
            }
          }
        }
        throw new KicadError(
          availability.status === 'too-old' ? 'kicad_cli_too_old' : 'kicad_cli_not_found',
          availability.message,
          { availability }
        )
      }
      this.renderService =
        this.host.createRenderService?.(resolveCli) ??
        new KicadRenderService({
          cacheRoot: kicadRenderCacheRoot(this.host.getUserDataPath()),
          run: runProcess,
          resolveCli
        })
    }
    return this.renderService
  }

  protected resolveAvailability(refresh: boolean): Promise<KicadCliAvailability> {
    const configuredPath = this.host.getSettings().kicadCliPath ?? null
    const key = configuredPath ?? ''
    const cached = this.availability
    if (!refresh && cached && cached.key === key && Date.now() - cached.at < AVAILABILITY_TTL_MS) {
      return cached.value
    }
    const value = this.host.getProcessEnv().then((env) =>
      discoverKicadCli({
        configuredPath,
        env,
        platform: process.platform,
        exists: existsSync,
        run: runProcess
      })
    )
    this.availability = { key, at: Date.now(), value }
    return value
  }
}

function isInside(root: string, candidate: string): boolean {
  const resolvedRoot = resolve(root)
  const resolvedCandidate = resolve(candidate)
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + sep)
}

function relativeTo(root: string, path: string): string {
  const resolvedRoot = resolve(root)
  const resolvedPath = resolve(path)
  const relativePath =
    resolvedPath === resolvedRoot ? '' : resolvedPath.slice(resolvedRoot.length + 1)
  return relativePath.replaceAll('\\', '/')
}
