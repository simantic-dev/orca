import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveKicadProject } from './kicad-project-resolution'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kicad-project-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function board(
  dir: string,
  name: string,
  options: { pcb?: boolean; sheets?: string[] } = {}
) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${name}.kicad_pro`), '{}')
  await writeFile(join(dir, `${name}.kicad_sch`), '(kicad_sch)')
  if (options.pcb) {
    await writeFile(join(dir, `${name}.kicad_pcb`), '(kicad_pcb)')
  }
  for (const sheet of options.sheets ?? []) {
    await writeFile(join(dir, `${sheet}.kicad_sch`), '(kicad_sch)')
  }
}

describe('resolveKicadProject', () => {
  it('resolves a directory with one project, root sheet first, board optional', async () => {
    await board(root, 'demo', { pcb: true, sheets: ['infra', 'sim'] })
    const project = await resolveKicadProject(root)
    expect(project).toMatchObject({
      name: 'demo',
      dir: root,
      proPath: join(root, 'demo.kicad_pro'),
      schPath: join(root, 'demo.kicad_sch'),
      pcbPath: join(root, 'demo.kicad_pcb')
    })
    expect(project.sheetPaths).toEqual([
      join(root, 'demo.kicad_sch'),
      join(root, 'infra.kicad_sch'),
      join(root, 'sim.kicad_sch')
    ])
  })

  it('accepts the .kicad_pro path itself and reports a missing board as null', async () => {
    await board(root, 'demo')
    const project = await resolveKicadProject(join(root, 'demo.kicad_pro'))
    expect(project.pcbPath).toBeNull()
  })

  it('refuses directories with no project or several projects by code', async () => {
    await expect(resolveKicadProject(root)).rejects.toMatchObject({
      code: 'kicad_project_not_found'
    })
    await board(root, 'a')
    await board(root, 'b')
    await expect(resolveKicadProject(root)).rejects.toMatchObject({
      code: 'kicad_project_ambiguous',
      data: { candidates: ['a.kicad_pro', 'b.kicad_pro'] }
    })
  })

  it('requires the root schematic and rejects other file kinds', async () => {
    await writeFile(join(root, 'lonely.kicad_pro'), '{}')
    await expect(resolveKicadProject(root)).rejects.toMatchObject({
      code: 'kicad_schematic_missing'
    })
    await writeFile(join(root, 'notes.txt'), '')
    await expect(resolveKicadProject(join(root, 'notes.txt'))).rejects.toMatchObject({
      code: 'kicad_project_not_found'
    })
  })
})
