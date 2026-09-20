import { describe, expect, it, vi } from 'vitest'
import { RuntimeAnalogCommands, type RuntimeAnalogCommandHost } from './runtime-analog-commands'
import type { ResolvedRuntimeFileTarget } from './runtime-file-command-target'

const discoverAnalogCli = vi.hoisted(() => vi.fn())
vi.mock('../analog-cli/analog-cli-discovery', () => ({ discoverAnalogCli }))

function target(
  executionHostId: ResolvedRuntimeFileTarget['executionHostId']
): ResolvedRuntimeFileTarget {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the commands under test read only executionHostId; the worktree row is never dereferenced.
  return { worktree: { id: 'wt', path: '/repo' } as never, executionHostId }
}

function host(overrides: Partial<RuntimeAnalogCommandHost> = {}): RuntimeAnalogCommandHost {
  return {
    getSettings: () => ({ analogCliPath: null }),
    resolveRuntimeFileTarget: async () => target('local'),
    getUserDataPath: () => '/tmp/userData',
    getProcessEnv: async () => ({ XDG_STATE_HOME: '/state' }),
    ...overrides
  }
}

describe('RuntimeAnalogCommands.analogToolchain', () => {
  it('refuses a remote workspace by code without probing anything', async () => {
    discoverAnalogCli.mockReset()
    const commands = new RuntimeAnalogCommands(
      host({ resolveRuntimeFileTarget: async () => target('ssh:box') })
    )
    await expect(commands.analogToolchain({ worktree: 'wt' })).rejects.toThrow(
      'analog_remote_unsupported'
    )
    expect(discoverAnalogCli).not.toHaveBeenCalled()
  })

  it('reports the CLI probe beside the history root the CLI would use', async () => {
    discoverAnalogCli.mockReset()
    discoverAnalogCli.mockResolvedValue({
      status: 'found',
      binaryPath: '/bin/analog-cli',
      version: '0.1.0',
      source: 'path'
    })
    const commands = new RuntimeAnalogCommands(host())
    const info = await commands.analogToolchain()
    expect(info.cli).toMatchObject({ status: 'found', binaryPath: '/bin/analog-cli' })
    expect(info.historyRoot).toBe('/state/analog-cli/history')
    await commands.analogToolchain()
    expect(discoverAnalogCli).toHaveBeenCalledTimes(1)
  })
})
