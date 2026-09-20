import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listKicadProjects } from './list-kicad-projects'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kicad-list-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('listKicadProjects', () => {
  it('finds every .kicad_pro outside ignored directories, sorted by path', async () => {
    for (const dir of [
      'boards/f401',
      'tests/fixtures/rc',
      'node_modules/x',
      '.git',
      'target/y',
      '.hidden'
    ]) {
      await mkdir(join(root, dir), { recursive: true })
      await writeFile(join(root, dir, 'p.kicad_pro'), '{}')
    }
    await writeFile(join(root, 'top.kicad_pro'), '{}')
    expect(await listKicadProjects(root)).toEqual([
      { name: 'p', proRelativePath: 'boards/f401/p.kicad_pro', dirRelativePath: 'boards/f401' },
      {
        name: 'p',
        proRelativePath: 'tests/fixtures/rc/p.kicad_pro',
        dirRelativePath: 'tests/fixtures/rc'
      },
      { name: 'top', proRelativePath: 'top.kicad_pro', dirRelativePath: '' }
    ])
  })
})
