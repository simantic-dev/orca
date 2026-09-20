import { describe, expect, it, vi } from 'vitest'
import { RuntimeKicadCommands, type RuntimeKicadCommandHost } from './runtime-kicad-commands'
import type { ResolvedRuntimeFileTarget } from './runtime-file-command-target'

const discoverKicadCli = vi.hoisted(() => vi.fn())
vi.mock('../kicad/kicad-cli-discovery', () => ({ discoverKicadCli }))

function target(
  executionHostId: ResolvedRuntimeFileTarget['executionHostId']
): ResolvedRuntimeFileTarget {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the commands under test read only executionHostId; the worktree row is never dereferenced.
  return { worktree: { id: 'wt', path: '/repo' } as never, executionHostId }
}

function host(overrides: Partial<RuntimeKicadCommandHost> = {}): RuntimeKicadCommandHost {
  return {
    getSettings: () => ({ kicadCliPath: null }),
    resolveRuntimeFileTarget: async () => target('local'),
    getUserDataPath: () => '/tmp/userData',
    getProcessEnv: async () => ({ PATH: '/usr/bin' }),
    ...overrides
  }
}

describe('RuntimeKicadCommands.kicadAvailability', () => {
  it('refuses a remote workspace by code without probing anything', async () => {
    discoverKicadCli.mockReset()
    const commands = new RuntimeKicadCommands(
      host({ resolveRuntimeFileTarget: async () => target('ssh:box') })
    )
    await expect(commands.kicadAvailability({ worktree: 'wt' })).rejects.toThrow(
      'kicad_remote_host_unsupported'
    )
    expect(discoverKicadCli).not.toHaveBeenCalled()
  })

  it('caches the probe per configured path until refresh is requested', async () => {
    discoverKicadCli.mockReset()
    discoverKicadCli.mockResolvedValue({ status: 'not-found', tried: [], message: 'none' })
    let configured: string | null = null
    const commands = new RuntimeKicadCommands(
      host({ getSettings: () => ({ kicadCliPath: configured }) })
    )
    await commands.kicadAvailability()
    await commands.kicadAvailability()
    expect(discoverKicadCli).toHaveBeenCalledTimes(1)
    configured = '/opt/kicad-cli'
    await commands.kicadAvailability()
    expect(discoverKicadCli).toHaveBeenCalledTimes(2)
    expect(discoverKicadCli).toHaveBeenLastCalledWith(
      expect.objectContaining({ configuredPath: '/opt/kicad-cli', env: { PATH: '/usr/bin' } })
    )
    await commands.kicadAvailability({ refresh: true })
    expect(discoverKicadCli).toHaveBeenCalledTimes(3)
  })
})

describe('RuntimeKicadCommands project routing', () => {
  it('refuses a project path that escapes the workspace', async () => {
    const commands = new RuntimeKicadCommands(host())
    await expect(
      commands.kicadResolveProject({ worktree: 'wt', relativePath: '../outside/x.kicad_pro' })
    ).rejects.toThrow('invalid_relative_path')
  })

  it('never lists or renders for a remote workspace', async () => {
    const commands = new RuntimeKicadCommands(
      host({ resolveRuntimeFileTarget: async () => target('ssh:box') })
    )
    await expect(commands.kicadListProjects({ worktree: 'wt' })).rejects.toThrow(
      'kicad_remote_host_unsupported'
    )
    await expect(
      commands.kicadRenderSchematic({ worktree: 'wt', relativePath: 'a.kicad_pro' })
    ).rejects.toThrow('kicad_remote_host_unsupported')
  })
})
