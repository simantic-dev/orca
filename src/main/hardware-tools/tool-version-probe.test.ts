import { describe, expect, it } from 'vitest'
import { probeToolVersion } from './tool-version-probe'
import type { ProcessResult } from '../../shared/child-process/process-spec'

function result(overrides: Partial<ProcessResult>): ProcessResult {
  return { code: 0, signal: null, stdout: '', stderr: '', timedOut: false, ...overrides }
}

describe('probeToolVersion', () => {
  it('parses the first dotted version and its major', async () => {
    const probe = await probeToolVersion(
      async () => result({ stdout: 'analog-cli 0.1.0\n' }),
      '/bin/analog-cli',
      ['--version'],
      1000
    )
    expect(probe).toEqual({ ok: true, version: '0.1.0', major: 0 })
  })

  it('reports a non-zero exit with the tool stderr', async () => {
    const probe = await probeToolVersion(
      async () => result({ code: 2, stderr: 'bad option' }),
      '/bin/tool',
      [],
      1000
    )
    expect(probe).toEqual({ ok: false, message: 'bad option' })
  })

  it('reports a timeout and a spawn failure without throwing', async () => {
    expect(
      await probeToolVersion(async () => result({ timedOut: true, code: null }), '/bin/t', [], 50)
    ).toMatchObject({ ok: false })
    expect(
      await probeToolVersion(
        async () => {
          throw new Error('ENOENT')
        },
        '/missing',
        [],
        50
      )
    ).toEqual({ ok: false, message: 'ENOENT' })
  })
})
