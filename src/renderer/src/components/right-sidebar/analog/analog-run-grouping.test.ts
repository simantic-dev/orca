import { describe, expect, it } from 'vitest'
import type { AnalogRunSummary, AnalogSessionCall } from '../../../../../shared/analog-cli-types'
import { buildAnalogRows, groupAnalogRows } from './analog-run-grouping'

function run(id: string, session: string | null, startedUnixMs: number): AnalogRunSummary {
  return {
    id,
    command: 'test',
    argv: ['analog-cli', 'test'],
    name: 'demo',
    target: '/w/demo',
    targetKind: 'project',
    cwd: '/w',
    startedUnixMs,
    wallElapsedSeconds: 1,
    exitCode: 0,
    session,
    parent: null,
    artifactCount: 0,
    datasetCount: 0,
    measurements: { total: 0, passed: 0, failed: 0 },
    reportSummary: null,
    dir: `/store/${id}`
  }
}

function call(
  id: string,
  session: string | null,
  startedUnixMs: number,
  extra: Partial<AnalogSessionCall>
): AnalogSessionCall {
  return {
    call: id,
    session,
    argv: ['analog-cli', 'test'],
    cwd: '/w',
    binary: null,
    startedUnixMs,
    pid: 1,
    endedUnixMs: null,
    exitCode: null,
    elapsedMs: null,
    historyId: null,
    inFlight: true,
    ...extra
  }
}

describe('analog run grouping', () => {
  it('lists runs plus in-flight and failed unrecorded calls, newest first, grouped by pane with unattributed last', () => {
    const rows = buildAnalogRows(
      [run('r1', 'leaf-a', 100), run('r2', null, 300)],
      [
        call('c1', 'leaf-a', 400, {}),
        call('c2', 'leaf-a', 90, { inFlight: false, exitCode: 0, historyId: 'r1' }),
        call('c3', 'leaf-b', 200, { inFlight: false, exitCode: 6 }),
        call('c4', 'leaf-b', 50, { inFlight: false, exitCode: 0 })
      ]
    )
    expect(rows.map((row) => row.key)).toEqual(['call:c1', 'run:r2', 'call:c3', 'run:r1'])
    const groups = groupAnalogRows(rows)
    expect(groups.map((group) => group.session)).toEqual(['leaf-a', 'leaf-b', null])
    expect(groups[0]?.rows.map((row) => row.key)).toEqual(['call:c1', 'run:r1'])
  })
})
