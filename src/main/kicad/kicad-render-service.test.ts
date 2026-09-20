import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProcessResult, ProcessSpec } from '../../shared/child-process/process-spec'
import type { KicadProject } from './kicad-project-resolution'
import { KicadRenderService } from './kicad-render-service'

let root: string
let project: KicadProject

const BOARD_TEXT = '(kicad_pcb (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (44 "Edge.Cuts" user)))'

function ok(): ProcessResult {
  return { code: 0, signal: null, stdout: '', stderr: '', timedOut: false }
}

/** Pretends to be kicad-cli: writes the files the real tool would write at `-o`. */
function fakeKicadCli(options: { glbBytes?: number; fail?: boolean; exitCode?: number } = {}) {
  return vi.fn(async (spec: ProcessSpec): Promise<ProcessResult> => {
    const args = spec.args ?? []
    const out = args[args.indexOf('-o') + 1]
    if (options.fail) {
      return { ...ok(), code: 3, stderr: 'boom: no such layer' }
    }
    const exit =
      options.exitCode === undefined
        ? ok()
        : { ...ok(), code: options.exitCode, stderr: 'model missing' }
    if (args[0] === 'sch') {
      const stem = basename(args.at(-1) ?? '', '.kicad_sch')
      await writeFile(join(out, `${stem}.svg`), '<svg>root</svg>')
      await writeFile(join(out, `${stem}-SIM.svg`), '<svg>sim</svg>')
      await writeFile(join(out, `${stem}-INFRA.svg`), '<svg>infra</svg>')
    } else if (args[2] === 'svg') {
      await writeFile(out, '<svg>board</svg>')
    } else if (args[2] === 'glb') {
      await writeFile(out, Buffer.alloc(options.glbBytes ?? 8, 1))
    }
    return exit
  })
}

function service(run = fakeKicadCli(), limits?: { glbMaxBytes?: number }) {
  return new KicadRenderService({
    cacheRoot: join(root, 'cache'),
    run,
    resolveCli: async () => ({ binaryPath: '/fake/kicad-cli' }),
    ...(limits ? { limits } : {})
  })
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kicad-render-'))
  const dir = join(root, 'board')
  await mkdir(dir)
  await writeFile(join(dir, 'demo.kicad_pro'), '{}')
  await writeFile(join(dir, 'demo.kicad_sch'), '(kicad_sch)')
  await writeFile(join(dir, 'demo.kicad_pcb'), BOARD_TEXT)
  project = {
    name: 'demo',
    dir,
    proPath: join(dir, 'demo.kicad_pro'),
    schPath: join(dir, 'demo.kicad_sch'),
    pcbPath: join(dir, 'demo.kicad_pcb'),
    sheetPaths: [join(dir, 'demo.kicad_sch')]
  }
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('KicadRenderService', () => {
  it('renders schematic pages root-first, then serves them from the cache', async () => {
    const run = fakeKicadCli()
    const renderer = service(run)
    const first = await renderer.renderSchematic(project)
    expect(first.cached).toBe(false)
    expect(first.pages.map((page) => [page.id, page.label])).toEqual([
      ['root', 'demo'],
      ['INFRA', 'INFRA'],
      ['SIM', 'SIM']
    ])
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0][0]).toMatchObject({ program: '/fake/kicad-cli', cwd: project.dir })
    const second = await renderer.renderSchematic(project)
    expect(second.cached).toBe(true)
    expect(run).toHaveBeenCalledTimes(1)
    const forced = await renderer.renderSchematic(project, { force: true })
    expect(forced.cached).toBe(false)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('streams an artifact back in chunks and refuses unknown ids', async () => {
    const renderer = service()
    const { pages } = await renderer.renderSchematic(project)
    const root = pages[0].artifact
    const chunk1 = await renderer.readArtifactChunk(root.artifactId, 0, 5)
    const chunk2 = await renderer.readArtifactChunk(root.artifactId, 5, 100)
    expect(Buffer.from(chunk1.contentBase64, 'base64').toString()).toBe('<svg>')
    expect(chunk1).toMatchObject({ bytesRead: 5, eof: false })
    expect(Buffer.from(chunk2.contentBase64, 'base64').toString()).toBe('root</svg>')
    expect(chunk2.eof).toBe(true)
    await expect(renderer.readArtifactChunk('nope', 0, 1)).rejects.toMatchObject({
      code: 'kicad_artifact_not_found'
    })
  })

  it('exports board layers with the parsed layer table and caches by layer set', async () => {
    const run = fakeKicadCli()
    const renderer = service(run)
    const front = await renderer.renderPcbLayers(project, { layers: ['F.Cu', 'Edge.Cuts'] })
    expect(front.cached).toBe(false)
    expect(front.layers.map((layer) => layer.name)).toEqual(['F.Cu', 'B.Cu', 'Edge.Cuts'])
    expect(front.artifact.mime).toBe('image/svg+xml')
    const back = await renderer.renderPcbLayers(project, { layers: ['B.Cu'], mirror: true })
    expect(back.cached).toBe(false)
    expect(run.mock.calls[1][0].args).toContain('--mirror')
    expect(
      (await renderer.renderPcbLayers(project, { layers: ['F.Cu', 'Edge.Cuts'] })).cached
    ).toBe(true)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('exports the 3D model and reports one over the byte budget by code', async () => {
    const small = await service().exportPcbModel(project)
    expect(small).toMatchObject({
      cached: false,
      detail: 'full',
      artifact: { mime: 'model/gltf-binary', byteLength: 8 }
    })
    await expect(
      service(fakeKicadCli({ glbBytes: 64 }), { glbMaxBytes: 16 }).exportPcbModel(project, {
        force: true
      })
    ).rejects.toMatchObject({
      code: 'kicad_artifact_too_large',
      data: { byteLength: 64, maxBytes: 16 }
    })
  })

  it('accepts an export that kicad-cli wrote despite a non-zero exit (missing 3D models)', async () => {
    const result = await service(fakeKicadCli({ exitCode: 2 })).exportPcbModel(project)
    expect(result.artifact.byteLength).toBe(8)
  })

  it('surfaces a failed export with the stderr tail, and a missing board by code', async () => {
    await expect(
      service(fakeKicadCli({ fail: true })).renderSchematic(project)
    ).rejects.toMatchObject({
      code: 'kicad_export_failed',
      data: { stderrTail: 'boom: no such layer' }
    })
    await expect(
      service().renderPcbLayers({ ...project, pcbPath: null }, { layers: ['F.Cu'] })
    ).rejects.toMatchObject({ code: 'kicad_pcb_missing' })
  })
})
