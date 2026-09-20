import { mkdir, mkdtemp, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  evictSiblingStamps,
  kicadProjectCacheDir,
  kicadStampDir,
  produceStampDir,
  produceStampFile,
  pruneKicadRenderCache,
  touchLastAccess
} from './kicad-render-cache'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kicad-cache-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('kicad render cache', () => {
  it('produces a stamp directory once and reports later calls as cached', async () => {
    const dir = kicadStampDir(kicadProjectCacheDir(root, '/p/a.kicad_pro'), 'sch', 'sch-1-1')
    let produced = 0
    const produce = async (tmpDir: string): Promise<void> => {
      produced += 1
      await writeFile(join(tmpDir, 'a.svg'), '<svg/>')
    }
    expect(await produceStampDir(dir, produce)).toEqual({ cached: false })
    expect(await produceStampDir(dir, produce)).toEqual({ cached: true })
    expect(produced).toBe(1)
    expect(await readdir(dir)).toEqual(['a.svg'])
  })

  it('leaves no half-written directory or file behind when the export fails', async () => {
    const projectDir = kicadProjectCacheDir(root, '/p/a.kicad_pro')
    const dir = kicadStampDir(projectDir, 'sch', 'sch-1-1')
    await expect(
      produceStampDir(dir, async () => {
        throw new Error('kicad-cli exploded')
      })
    ).rejects.toThrow('kicad-cli exploded')
    expect(await readdir(join(projectDir, 'sch'))).toEqual([])
    const pcbDir = kicadStampDir(projectDir, 'pcb', 'pcb-1-1')
    await expect(
      produceStampFile(pcbDir, 'front.svg', async () => {
        throw new Error('nope')
      })
    ).rejects.toThrow('nope')
    expect(await readdir(pcbDir)).toEqual([])
    const file = await produceStampFile(pcbDir, 'front.svg', (tmp) => writeFile(tmp, '<svg/>'))
    expect(file).toEqual({ path: join(pcbDir, 'front.svg'), cached: false })
    expect((await produceStampFile(pcbDir, 'front.svg', (tmp) => writeFile(tmp, 'x'))).cached).toBe(
      true
    )
  })

  it('evicts other stamps of the same view but keeps the current one', async () => {
    const projectDir = kicadProjectCacheDir(root, '/p/a.kicad_pro')
    for (const stamp of ['sch-1-1', 'sch-2-1']) {
      await mkdir(kicadStampDir(projectDir, 'sch', stamp), { recursive: true })
    }
    await mkdir(kicadStampDir(projectDir, 'pcb', 'pcb-9-9'), { recursive: true })
    const removed = await evictSiblingStamps(projectDir, 'sch', 'sch-2-1')
    expect(removed).toEqual([join(projectDir, 'sch', 'sch-1-1')])
    expect(await readdir(join(projectDir, 'sch'))).toEqual(['sch-2-1'])
    expect(await readdir(join(projectDir, 'pcb'))).toEqual(['pcb-9-9'])
  })

  it('prunes projects idle past the limit and the oldest ones over the byte budget', async () => {
    const now = Date.parse('2026-09-18T00:00:00Z')
    const idle = kicadProjectCacheDir(root, '/idle.kicad_pro')
    const big = kicadProjectCacheDir(root, '/big.kicad_pro')
    const fresh = kicadProjectCacheDir(root, '/fresh.kicad_pro')
    for (const [dir, ageDays, bytes] of [
      [idle, 40, 10],
      [big, 2, 1000],
      [fresh, 1, 10]
    ] as const) {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'blob'), 'x'.repeat(bytes))
      const when = new Date(now - ageDays * 24 * 60 * 60 * 1000)
      await touchLastAccess(dir, when)
      await utimes(join(dir, '.last-access'), when, when)
    }
    const removed = await pruneKicadRenderCache(root, { now, maxTotalBytes: 500 })
    expect(removed.sort()).toEqual([big, idle].sort())
    await expect(stat(fresh)).resolves.toBeTruthy()
  })
})
