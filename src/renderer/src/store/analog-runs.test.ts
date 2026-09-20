import { describe, expect, it } from 'vitest'
import {
  selectAnalogActivityIndicator,
  useAnalogRunsStore,
  EMPTY_ANALOG_WORKTREE_STATE
} from './analog-runs'
import type { AnalogRunSummary, AnalogSessionCall } from '../../../shared/analog-cli-types'

function run(id: string, exitCode: number): AnalogRunSummary {
  return {
    id,
    command: 'test',
    argv: [],
    name: null,
    target: null,
    targetKind: null,
    cwd: '/w',
    startedUnixMs: 1,
    wallElapsedSeconds: 1,
    exitCode,
    session: null,
    parent: null,
    artifactCount: 0,
    datasetCount: 0,
    measurements: { total: 0, passed: 0, failed: 0 },
    reportSummary: null,
    dir: '/s'
  }
}

const inFlight: AnalogSessionCall = {
  call: '1-1',
  session: null,
  argv: [],
  cwd: '/w',
  binary: null,
  startedUnixMs: 1,
  pid: 1,
  endedUnixMs: null,
  exitCode: null,
  elapsedMs: null,
  historyId: null,
  inFlight: true
}

describe('analog activity indicator', () => {
  it('is pending while a call runs, failure until a failed newest run is viewed, otherwise nothing', () => {
    const state = useAnalogRunsStore.getState()
    const withRuns = {
      ...state,
      byWorktree: { w: { ...EMPTY_ANALOG_WORKTREE_STATE, runs: [run('b', 1), run('a', 0)] } }
    }
    expect(selectAnalogActivityIndicator(withRuns, 'w')).toBe('failure')
    expect(
      selectAnalogActivityIndicator({ ...withRuns, lastViewedRunIdByWorktree: { w: 'b' } }, 'w')
    ).toBeNull()
    expect(
      selectAnalogActivityIndicator(
        { ...withRuns, byWorktree: { w: { ...withRuns.byWorktree.w, calls: [inFlight] } } },
        'w'
      )
    ).toBe('pending')
    expect(selectAnalogActivityIndicator(withRuns, null)).toBeNull()
  })
})
