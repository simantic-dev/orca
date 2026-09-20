import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listAnalogRuns, readAnalogRun } from './analog-history-store'

const FIXTURE = join(import.meta.dirname, '__fixtures__', 'run-manifest.json')
let root: string

async function run(id: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const dir = join(root, id)
  await mkdir(dir, { recursive: true })
  const manifest = {
    ...JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(FIXTURE, 'utf8'))),
    id,
    ...overrides
  }
  await writeFile(join(dir, 'run.json'), JSON.stringify(manifest))
  await cp(
    join(import.meta.dirname, '__fixtures__', '01-tran-bring-up.csv'),
    join(dir, '01-tran-bring-up.csv')
  )
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'analog-history-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('analog history store', () => {
  it('lists runs newest first with derived counts, honouring limit and workspace scope', async () => {
    await run('20260915-073649-947-8822')
    await run('20260916-000000-000-0001', { target: '/elsewhere/deck.cir', cwd: '/elsewhere' })
    await run('20260917-000000-000-0002', { target: undefined, cwd: '/repo/sub' })
    await mkdir(join(root, '20260918-000000-000-0003'))
    await writeFile(join(root, '20260918-000000-000-0003', 'run.json'), '{not json')
    await writeFile(join(root, 'notes.txt'), '')
    const all = await listAnalogRuns(root, { limit: 10 })
    expect(all.runs.map((r) => r.id)).toEqual([
      '20260917-000000-000-0002',
      '20260916-000000-000-0001',
      '20260915-073649-947-8822'
    ])
    expect(all.corrupt).toEqual(['20260918-000000-000-0003'])
    expect(all.runs[2]).toMatchObject({
      name: 'f401_i2c_dac_pcb',
      targetKind: 'project',
      session: '0f4b2c1e-5d6a-4b7c-8d9e-0a1b2c3d4e5f',
      measurements: { total: 2, passed: 1, failed: 1 },
      reportSummary: { total: 2, passed: 1, failed: 1, errors: 0, skipped: 0, notImplemented: 0 },
      datasetCount: 1
    })
    const scoped = await listAnalogRuns(root, { limit: 10, scopePath: '/repo' })
    expect(scoped.runs.map((r) => r.id)).toEqual([
      '20260917-000000-000-0002',
      '20260915-073649-947-8822'
    ])
    expect((await listAnalogRuns(root, { limit: 1 })).runs).toHaveLength(1)
  })

  it('reads one run with dataset paths filled in and refuses unknown ids by code', async () => {
    await run('20260915-073649-947-8822')
    const manifest = await readAnalogRun(root, '20260915-073649-947-8822')
    expect(manifest.datasets[0]).toMatchObject({
      file: '01-tran-bring-up.csv',
      path: join(root, '20260915-073649-947-8822', '01-tran-bring-up.csv'),
      sweepName: 'time',
      columns: ['V(/vdac)', 'V(/vout)']
    })
    expect(manifest.measurementsList[1]).toEqual({
      name: 'settle',
      value: null,
      pass: false,
      test: 'bring-up',
      point: null,
      signals: []
    })
    await expect(readAnalogRun(root, '20260101-000000-000-0000')).rejects.toThrow(
      'analog_run_not_found'
    )
    await expect(readAnalogRun(root, '../escape')).rejects.toThrow('analog_run_not_found')
  })
})
