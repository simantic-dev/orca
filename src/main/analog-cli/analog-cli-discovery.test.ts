import { describe, expect, it, vi } from 'vitest'
import {
  discoverAnalogCli,
  newestInstalledAnalogCliRelease,
  type AnalogCliDiscoveryHost
} from './analog-cli-discovery'
import type { ProcessResult } from '../../shared/child-process/process-spec'

const HOME = '/Users/me'
const RELEASES = `${HOME}/.simantic/cli/releases`

function versions(map: Record<string, string>) {
  return vi.fn(async ({ program }: { program: string }): Promise<ProcessResult> => {
    const version = map[program]
    return version
      ? { code: 0, signal: null, stdout: `analog-cli ${version}\n`, stderr: '', timedOut: false }
      : { code: 127, signal: null, stdout: '', stderr: 'not found', timedOut: false }
  })
}

function host(overrides: Partial<AnalogCliDiscoveryHost>): AnalogCliDiscoveryHost {
  return {
    configuredPath: null,
    env: {},
    platform: 'darwin',
    homeDir: HOME,
    exists: () => false,
    listDirectory: () => [],
    run: versions({}),
    ...overrides
  }
}

describe('newestInstalledAnalogCliRelease', () => {
  it('picks the newest version directory digit-aware and skips ones without a binary', () => {
    const present = new Set([
      RELEASES,
      `${RELEASES}/0.9.0/analog-cli`,
      `${RELEASES}/0.10.0/analog-cli`
    ])
    const newest = newestInstalledAnalogCliRelease(
      host({
        exists: (path) => present.has(path),
        listDirectory: () => ['0.9.0', '0.10.0', 'broken']
      })
    )
    expect(newest).toBe(`${RELEASES}/0.10.0/analog-cli`)
  })
})

describe('discoverAnalogCli', () => {
  it('uses the configured path first and reports its version', async () => {
    const result = await discoverAnalogCli(
      host({
        configuredPath: '/repo/target/release/analog-cli',
        run: versions({ '/repo/target/release/analog-cli': '0.1.0' })
      })
    )
    expect(result).toEqual({
      status: 'found',
      binaryPath: '/repo/target/release/analog-cli',
      version: '0.1.0',
      source: 'settings'
    })
  })

  it('does not fall back when the configured binary fails to answer', async () => {
    const run = versions({ '/usr/local/bin/analog-cli': '0.1.0' })
    const result = await discoverAnalogCli(
      host({ configuredPath: '/bogus', env: { PATH: '/usr/local/bin' }, exists: () => true, run })
    )
    expect(result).toMatchObject({ status: 'not-found', tried: ['/bogus'] })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('walks PATH, then the installed releases', async () => {
    const releaseBinary = `${RELEASES}/test/analog-cli`
    const present = new Set([RELEASES, releaseBinary])
    const result = await discoverAnalogCli(
      host({
        env: { PATH: '/usr/bin' },
        exists: (path) => present.has(path),
        listDirectory: () => ['test'],
        run: versions({ [releaseBinary]: '0.1.0' })
      })
    )
    expect(result).toMatchObject({
      status: 'found',
      binaryPath: releaseBinary,
      source: 'simantic-releases'
    })
  })

  it('reports not-found with the candidates it tried', async () => {
    const result = await discoverAnalogCli(host({ env: { PATH: '' } }))
    expect(result).toMatchObject({ status: 'not-found', tried: [] })
  })
})
