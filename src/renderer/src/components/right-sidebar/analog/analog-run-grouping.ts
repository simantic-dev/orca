import type { AnalogRunSummary, AnalogSessionCall } from '../../../../../shared/analog-cli-types'

export type AnalogRunRowModel =
  | {
      kind: 'run'
      key: string
      session: string | null
      startedUnixMs: number
      run: AnalogRunSummary
    }
  | {
      kind: 'call'
      key: string
      session: string | null
      startedUnixMs: number
      call: AnalogSessionCall
    }

export type AnalogSessionGroup = {
  session: string | null
  newestAt: number
  rows: AnalogRunRowModel[]
}

/**
 * One row per recorded run, plus the session-log calls the store does not know yet: calls still
 * running, and finished calls that recorded nothing but failed (a refused plan is worth seeing).
 */
export function buildAnalogRows(
  runs: AnalogRunSummary[],
  calls: AnalogSessionCall[]
): AnalogRunRowModel[] {
  const recorded = new Set(runs.map((run) => run.id))
  const rows: AnalogRunRowModel[] = runs.map((run) => ({
    kind: 'run',
    key: `run:${run.id}`,
    session: run.session,
    startedUnixMs: run.startedUnixMs,
    run
  }))
  for (const call of calls) {
    if (call.historyId && recorded.has(call.historyId)) {
      continue
    }
    if (!call.inFlight && (call.exitCode === 0 || call.exitCode === null)) {
      continue
    }
    rows.push({
      kind: 'call',
      key: `call:${call.call}`,
      session: call.session,
      startedUnixMs: call.startedUnixMs,
      call
    })
  }
  return rows.sort((a, b) => b.startedUnixMs - a.startedUnixMs)
}

/** Groups by the terminal pane (session id) that ran them; unattributed rows go last. */
export function groupAnalogRows(rows: AnalogRunRowModel[]): AnalogSessionGroup[] {
  const groups = new Map<string | null, AnalogSessionGroup>()
  for (const row of rows) {
    const group = groups.get(row.session) ?? { session: row.session, newestAt: 0, rows: [] }
    group.rows.push(row)
    group.newestAt = Math.max(group.newestAt, row.startedUnixMs)
    groups.set(row.session, group)
  }
  return [...groups.values()].sort((a, b) => {
    if (a.session === null) {
      return 1
    }
    if (b.session === null) {
      return -1
    }
    return b.newestAt - a.newestAt
  })
}
