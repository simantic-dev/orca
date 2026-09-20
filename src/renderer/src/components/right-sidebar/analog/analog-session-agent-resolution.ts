import type { AgentStatusEntry } from '../../../../../shared/agent-status-types'
import { parsePaneKey } from '../../../../../shared/stable-pane-id'

/** The three facets the Analog sidebar shows for a pane; the full status row is not needed. */
export type AnalogSessionAgentFacets = Pick<AgentStatusEntry, 'state' | 'agentType' | 'prompt'>

export type AnalogSessionPane = {
  paneKey: string
  tabId: string
  leafId: string
  entry: AnalogSessionAgentFacets
}

/** The session id analog-cli stamped is the pane's leaf uuid, so the agent status row keyed by that pane is the join. */
export function resolveAnalogSessionPane(
  agentStatusByPaneKey: Record<string, AnalogSessionAgentFacets>,
  session: string
): AnalogSessionPane | null {
  for (const [paneKey, entry] of Object.entries(agentStatusByPaneKey)) {
    const parsed = parsePaneKey(paneKey)
    if (parsed && parsed.leafId === session) {
      return { paneKey, tabId: parsed.tabId, leafId: parsed.leafId, entry }
    }
  }
  return null
}

export function describeAnalogSessionPane(pane: AnalogSessionPane | null): {
  title: string
  detail: string | null
} {
  if (!pane) {
    return { title: '', detail: null }
  }
  const agent =
    pane.entry.agentType && pane.entry.agentType !== 'unknown' ? pane.entry.agentType : null
  const prompt = pane.entry.prompt?.trim() ?? ''
  return {
    title: agent ?? '',
    detail: prompt ? prompt.slice(0, 120) : null
  }
}
