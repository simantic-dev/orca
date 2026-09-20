import { describe, expect, it } from 'vitest'
import { buildAnalogRunTabId, getAnalogRunTabLabel, isAnalogRunTabId } from './analog-run-tab-state'

describe('analog run tab state', () => {
  it('builds a recognisable synthetic id and a readable label', () => {
    const id = buildAnalogRunTabId('repo::/w', '20260915-073649-947-8822')
    expect(isAnalogRunTabId(id)).toBe(true)
    expect(isAnalogRunTabId('/w/file.ts')).toBe(false)
    expect(
      getAnalogRunTabLabel({ command: 'analyze/tran', name: 'rc_divider', target: null })
    ).toBe('analyze tran · rc_divider')
    expect(getAnalogRunTabLabel({ command: 'run', name: null, target: '/w/decks/amp.cir' })).toBe(
      'run · amp.cir'
    )
  })
})
