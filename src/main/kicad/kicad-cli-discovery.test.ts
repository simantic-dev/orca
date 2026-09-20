import { describe, expect, it, vi } from 'vitest'
import { discoverKicadCli, type KicadCliDiscoveryHost } from './kicad-cli-discovery'
import type { ProcessResult } from '../../shared/child-process/process-spec'

const MAC_APP = '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'

function versions(map: Record<string, string>) {
  return vi.fn(async ({ program }: { program: string }): Promise<ProcessResult> => {
    const version = map[program]
    return version
      ? { code: 0, signal: null, stdout: `${version}\n`, stderr: '', timedOut: false }
      : { code: 127, signal: null, stdout: '', stderr: 'not found', timedOut: false }
  })
}

function host(overrides: Partial<KicadCliDiscoveryHost>): KicadCliDiscoveryHost {
  return {
    configuredPath: null,
    env: {},
    platform: 'darwin',
    exists: () => false,
    run: versions({}),
    ...overrides
  }
}

describe('discoverKicadCli', () => {
  it('prefers PATH over the app bundle and reports the source', async () => {
    const run = versions({ '/usr/local/bin/kicad-cli': '9.0.3', [MAC_APP]: '8.0.1' })
    const found = await discoverKicadCli(
      host({
        env: { PATH: '/usr/local/bin' },
        exists: (path) => path === '/usr/local/bin/kicad-cli' || path === MAC_APP,
        run
      })
    )
    expect(found).toEqual({
      status: 'found',
      binaryPath: '/usr/local/bin/kicad-cli',
      version: '9.0.3',
      major: 9,
      source: 'path'
    })
  })

  it('falls back to the macOS app bundle when PATH has nothing', async () => {
    const found = await discoverKicadCli(
      host({ exists: (path) => path === MAC_APP, run: versions({ [MAC_APP]: '9.0.3' }) })
    )
    expect(found).toMatchObject({ status: 'found', binaryPath: MAC_APP, source: 'app-bundle' })
  })

  it('never falls back past an explicitly configured binary that fails', async () => {
    const run = versions({ [MAC_APP]: '9.0.3' })
    const result = await discoverKicadCli(
      host({ configuredPath: '/nonexistent/kicad-cli', exists: () => true, run })
    )
    expect(result).toMatchObject({ status: 'not-found', tried: ['/nonexistent/kicad-cli'] })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('honours the SIMANTIC_KICAD_CLI environment variable as an explicit choice', async () => {
    const result = await discoverKicadCli(
      host({
        env: { SIMANTIC_KICAD_CLI: '/opt/kicad-cli' },
        run: versions({ '/opt/kicad-cli': '8.0.4' })
      })
    )
    expect(result).toMatchObject({ status: 'found', binaryPath: '/opt/kicad-cli', source: 'env' })
  })

  it('flags KiCad 7 as too old', async () => {
    const result = await discoverKicadCli(
      host({ exists: (path) => path === MAC_APP, run: versions({ [MAC_APP]: '7.0.11' }) })
    )
    expect(result).toMatchObject({ status: 'too-old', major: 7, binaryPath: MAC_APP })
  })

  it('reports every candidate it tried when nothing works', async () => {
    const result = await discoverKicadCli(host({ platform: 'linux', env: { PATH: '/bin' } }))
    expect(result).toMatchObject({ status: 'not-found', tried: [] })
  })
})
