import { describe, expect, it } from 'vitest'
import { findExecutableOnPath } from './executable-on-path'

describe('findExecutableOnPath', () => {
  it('returns the first PATH entry that holds the executable', () => {
    const found = findExecutableOnPath('kicad-cli', {
      env: { PATH: '/nowhere:/usr/local/bin:/opt/kicad/bin' },
      platform: 'darwin',
      exists: (path) => path === '/opt/kicad/bin/kicad-cli' || path === '/usr/local/bin/kicad-cli'
    })
    expect(found).toBe('/usr/local/bin/kicad-cli')
  })

  it('looks for an .exe on Windows and reads Path when PATH is absent', () => {
    const found = findExecutableOnPath('analog-cli', {
      env: { Path: 'C:\\tools;C:\\bin' },
      platform: 'win32',
      exists: (path) => path === 'C:\\bin\\analog-cli.exe'
    })
    expect(found).toBe('C:\\bin\\analog-cli.exe')
  })

  it('returns null when no entry matches', () => {
    expect(
      findExecutableOnPath('analog-cli', { env: {}, platform: 'linux', exists: () => false })
    ).toBeNull()
  })
})
