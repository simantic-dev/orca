import { describe, expect, it } from 'vitest'
import { resolveAnalogHistoryRoot } from './analog-history-root'

describe('resolveAnalogHistoryRoot', () => {
  it('follows the CLI precedence: explicit dir, XDG state home, then ~/.local/state', () => {
    expect(resolveAnalogHistoryRoot({ ANALOG_CLI_HISTORY_DIR: '/x/hist' }, '/home/u')).toBe(
      '/x/hist'
    )
    expect(resolveAnalogHistoryRoot({ XDG_STATE_HOME: '/state' }, '/home/u')).toBe(
      '/state/analog-cli/history'
    )
    expect(resolveAnalogHistoryRoot({}, '/home/u')).toBe('/home/u/.local/state/analog-cli/history')
  })
})
