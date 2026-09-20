import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pcbSourceStamp, schematicSourceStamp } from './kicad-source-stamp'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kicad-stamp-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('source stamps', () => {
  it('changes the schematic stamp when a sub-sheet is saved later than the root', async () => {
    const rootSheet = join(root, 'a.kicad_sch')
    const subSheet = join(root, 'b.kicad_sch')
    await writeFile(rootSheet, '')
    await writeFile(subSheet, '')
    const base = new Date('2026-01-01T00:00:00Z')
    await utimes(rootSheet, base, base)
    await utimes(subSheet, base, base)
    const before = await schematicSourceStamp([rootSheet, subSheet])
    const later = new Date('2026-01-02T00:00:00Z')
    await utimes(subSheet, later, later)
    const after = await schematicSourceStamp([rootSheet, subSheet])
    expect(before).toBe(`sch-${base.getTime()}-2`)
    expect(after).toBe(`sch-${later.getTime()}-2`)
  })

  it('keys the board stamp on mtime and size', async () => {
    const board = join(root, 'a.kicad_pcb')
    await writeFile(board, '12345')
    const when = new Date('2026-03-04T05:06:07Z')
    await utimes(board, when, when)
    expect(await pcbSourceStamp(board)).toBe(`pcb-${when.getTime()}-5`)
  })
})
