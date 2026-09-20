import { join } from 'node:path'
import { findExecutableOnPath } from '../hardware-tools/executable-on-path'
import { probeToolVersion, type ToolProcessRunner } from '../hardware-tools/tool-version-probe'
import {
  ANALOG_CLI_ENV,
  type AnalogCliAvailability,
  type AnalogCliSource
} from '../../shared/analog-cli-types'

export type AnalogCliDiscoveryHost = {
  configuredPath: string | null
  env: NodeJS.ProcessEnv
  platform: NodeJS.Platform
  homeDir: string
  exists: (path: string) => boolean
  listDirectory: (path: string) => string[]
  run: ToolProcessRunner
}

const PROBE_TIMEOUT_MS = 5_000
const RELEASES_DIR = ['.simantic', 'cli', 'releases']

type Candidate = { path: string; source: AnalogCliSource; explicit: boolean }

function binaryName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'analog-cli.exe' : 'analog-cli'
}

/** Newest installed release under `~/.simantic/cli/releases/<version>/`, digit-aware so 0.10 beats 0.9. */
export function newestInstalledAnalogCliRelease(host: AnalogCliDiscoveryHost): string | null {
  const releasesRoot = join(host.homeDir, ...RELEASES_DIR)
  if (!host.exists(releasesRoot)) {
    return null
  }
  const collator = new Intl.Collator('en', { numeric: true })
  const versions = host
    .listDirectory(releasesRoot)
    .filter((entry) => host.exists(join(releasesRoot, entry, binaryName(host.platform))))
    .sort((a, b) => collator.compare(b, a))
  return versions.length === 0 ? null : join(releasesRoot, versions[0], binaryName(host.platform))
}

function candidates(host: AnalogCliDiscoveryHost): Candidate[] {
  const configured = host.configuredPath?.trim()
  if (configured) {
    return [{ path: configured, source: 'settings', explicit: true }]
  }
  const fromEnv = host.env[ANALOG_CLI_ENV]?.trim()
  if (fromEnv) {
    return [{ path: fromEnv, source: 'env', explicit: true }]
  }
  const list: Candidate[] = []
  const onPath = findExecutableOnPath('analog-cli', host)
  if (onPath) {
    list.push({ path: onPath, source: 'path', explicit: false })
  }
  const release = newestInstalledAnalogCliRelease(host)
  if (release) {
    list.push({ path: release, source: 'simantic-releases', explicit: false })
  }
  return list
}

/** An explicitly named binary that fails is an error, never a fallback to a different one. */
export async function discoverAnalogCli(
  host: AnalogCliDiscoveryHost
): Promise<AnalogCliAvailability> {
  const tried: string[] = []
  for (const candidate of candidates(host)) {
    tried.push(candidate.path)
    const probe = await probeToolVersion(host.run, candidate.path, ['--version'], PROBE_TIMEOUT_MS)
    if (probe.ok) {
      return {
        status: 'found',
        binaryPath: candidate.path,
        version: probe.version,
        source: candidate.source
      }
    }
    if (candidate.explicit) {
      return { status: 'not-found', tried, message: `${candidate.path}: ${probe.message}` }
    }
  }
  return {
    status: 'not-found',
    tried,
    message:
      'analog-cli was not found. Install it with the simantic installer, or set its path in Settings.'
  }
}
