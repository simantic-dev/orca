import { describe, expect, it } from 'vitest'
import {
  analogCliSessionIdFromPaneKey,
  analogCliSessionLogPath,
  buildAnalogCliSessionEnv
} from './analog-cli-session-env'

const LEAF = '0f4b2c1e-5d6a-4b7c-8d9e-0a1b2c3d4e5f'

describe('analog-cli session env', () => {
  it('uses the pane leaf uuid as the session id, which fits the CLI alphabet and length', () => {
    const id = analogCliSessionIdFromPaneKey(`tab-1:${LEAF}`)
    expect(id).toBe(LEAF)
    expect(id).toMatch(/^[A-Za-z0-9._-]{1,64}$/)
    expect(analogCliSessionIdFromPaneKey('weird/key:with:colons')).toMatch(/^[A-Za-z0-9._-]{1,64}$/)
  })

  it('keeps the log outside the repository, keyed by workspace', () => {
    const path = analogCliSessionLogPath('/Users/me/Library/Orca', 'repo::/w/board')
    expect(path.startsWith('/Users/me/Library/Orca/analog-cli/sessions/')).toBe(true)
    expect(path.endsWith('.jsonl')).toBe(true)
    expect(analogCliSessionLogPath('/u', 'a')).not.toBe(analogCliSessionLogPath('/u', 'b'))
  })

  it('sets both variables locally and only the session id for a remote pane', () => {
    const local = buildAnalogCliSessionEnv({
      paneKey: `t:${LEAF}`,
      worktreeId: 'w',
      isLocalHost: true,
      userDataPath: '/u'
    })
    expect(Object.keys(local).sort()).toEqual(['ANALOG_CLI_SESSION', 'ANALOG_CLI_SESSION_LOG'])
    const remote = buildAnalogCliSessionEnv({
      paneKey: `t:${LEAF}`,
      worktreeId: 'w',
      isLocalHost: false,
      userDataPath: '/u'
    })
    expect(Object.keys(remote)).toEqual(['ANALOG_CLI_SESSION'])
    expect(local.ANALOG_CLI_SESSION_LOG?.endsWith('.jsonl')).toBe(true)
  })
})

describe('applyAnalogCliSessionEnv', () => {
  it('stamps a local PTY env that carries the pane identity and leaves others alone', async () => {
    const { applyAnalogCliSessionEnv } = await import('./analog-cli-session-env')
    const stamped = applyAnalogCliSessionEnv(
      { ORCA_PANE_KEY: `tab:${LEAF}`, ORCA_WORKTREE_ID: 'repo::/w', PATH: '/bin' },
      '/u'
    )
    expect(stamped.ANALOG_CLI_SESSION).toBe(LEAF)
    expect(stamped.ANALOG_CLI_SESSION_LOG?.startsWith('/u/analog-cli/sessions/')).toBe(true)
    expect(applyAnalogCliSessionEnv({ PATH: '/bin' }, '/u')).toEqual({ PATH: '/bin' })
  })
})
