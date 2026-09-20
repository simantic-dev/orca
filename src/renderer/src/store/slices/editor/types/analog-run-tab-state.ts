import type { AnalogRunManifest, AnalogRunSummary } from '../../../../../../shared/analog-cli-types'

/** Backing state of a virtual editor tab that shows one recorded analog-cli run. */
export type OpenAnalogRunState = {
  worktreeId: string
  historyId: string
  summary: AnalogRunSummary
  manifest: AnalogRunManifest | null
  loading: boolean
  error: string | null
  requestId: number
}

export const ANALOG_RUN_TAB_ID_PREFIX = 'analog-run::'

export function buildAnalogRunTabId(worktreeId: string, historyId: string): string {
  return `${ANALOG_RUN_TAB_ID_PREFIX}${worktreeId}::${historyId}`
}

export function isAnalogRunTabId(id: string): boolean {
  return id.startsWith(ANALOG_RUN_TAB_ID_PREFIX)
}

export function getAnalogRunTabLabel(
  summary: Pick<AnalogRunSummary, 'command' | 'name' | 'target'>
): string {
  const subject = summary.name ?? summary.target?.split(/[\\/]/).pop() ?? ''
  const command = summary.command.replace('/', ' ')
  return subject ? `${command} · ${subject}` : command
}
