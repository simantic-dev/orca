import { describe, expect, it } from 'vitest'
import {
  describeAnalogSessionPane,
  resolveAnalogSessionPane
} from './analog-session-agent-resolution'

const LEAF = '0f4b2c1e-5d6a-4b7c-8d9e-0a1b2c3d4e5f'

describe('analog session agent resolution', () => {
  it('finds the agent status row whose pane leaf matches the session id', () => {
    const entry = { state: 'working' as const, agentType: 'claude', prompt: 'simulate the filter' }
    const pane = resolveAnalogSessionPane({ [`tab-1:${LEAF}`]: entry, 'tab-2:other': entry }, LEAF)
    expect(pane).toMatchObject({ paneKey: `tab-1:${LEAF}`, tabId: 'tab-1', leafId: LEAF })
    expect(describeAnalogSessionPane(pane)).toEqual({
      title: 'claude',
      detail: 'simulate the filter'
    })
    expect(resolveAnalogSessionPane({}, LEAF)).toBeNull()
    expect(describeAnalogSessionPane(null)).toEqual({ title: '', detail: null })
  })
})
