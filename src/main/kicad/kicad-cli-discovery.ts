import { findExecutableOnPath } from '../hardware-tools/executable-on-path'
import { probeToolVersion, type ToolProcessRunner } from '../hardware-tools/tool-version-probe'
import {
  KICAD_CLI_ENV,
  KICAD_CLI_MIN_MAJOR,
  type KicadCliAvailability,
  type KicadCliSource
} from '../../shared/kicad-viewer-contract'

export type KicadCliDiscoveryHost = {
  configuredPath: string | null
  env: NodeJS.ProcessEnv
  platform: NodeJS.Platform
  exists: (path: string) => boolean
  run: ToolProcessRunner
}

const MAC_APP_PATH = '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
const WINDOWS_APP_PATHS = ['9.0', '8.0', '7.0'].map(
  (version) => `C:\\Program Files\\KiCad\\${version}\\bin\\kicad-cli.exe`
)
const PROBE_TIMEOUT_MS = 10_000

type Candidate = { path: string; source: KicadCliSource; explicit: boolean }

// Mirrors analog-cli's own ladder (src/frontend/kicad_cli.rs) so both tools agree on the binary.
function candidates(host: KicadCliDiscoveryHost): Candidate[] {
  const configured = host.configuredPath?.trim()
  if (configured) {
    return [{ path: configured, source: 'settings', explicit: true }]
  }
  const fromEnv = host.env[KICAD_CLI_ENV]?.trim()
  if (fromEnv) {
    return [{ path: fromEnv, source: 'env', explicit: true }]
  }
  const list: Candidate[] = []
  const onPath = findExecutableOnPath('kicad-cli', host)
  if (onPath) {
    list.push({ path: onPath, source: 'path', explicit: false })
  }
  const bundled =
    host.platform === 'darwin' ? [MAC_APP_PATH] : host.platform === 'win32' ? WINDOWS_APP_PATHS : []
  for (const path of bundled) {
    if (host.exists(path)) {
      list.push({ path, source: 'app-bundle', explicit: false })
    }
  }
  return list
}

/** An explicitly named binary that fails is an error, never a fallback to a different one. */
export async function discoverKicadCli(host: KicadCliDiscoveryHost): Promise<KicadCliAvailability> {
  const tried: string[] = []
  for (const candidate of candidates(host)) {
    tried.push(candidate.path)
    const probe = await probeToolVersion(host.run, candidate.path, ['version'], PROBE_TIMEOUT_MS)
    if (!probe.ok) {
      if (candidate.explicit) {
        return { status: 'not-found', tried, message: `${candidate.path}: ${probe.message}` }
      }
      continue
    }
    if (probe.major < KICAD_CLI_MIN_MAJOR) {
      return {
        status: 'too-old',
        binaryPath: candidate.path,
        version: probe.version,
        major: probe.major,
        source: candidate.source,
        message: `kicad-cli ${probe.version} is too old; KiCad ${KICAD_CLI_MIN_MAJOR} or newer is required`
      }
    }
    return {
      status: 'found',
      binaryPath: candidate.path,
      version: probe.version,
      major: probe.major,
      source: candidate.source
    }
  }
  return {
    status: 'not-found',
    tried,
    message: 'kicad-cli was not found. Install KiCad 8 or newer, or set its path in Settings.'
  }
}
