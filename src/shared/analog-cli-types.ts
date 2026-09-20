// Shared result shapes and error codes for the analog-cli integration (`analog.*` RPC).

export type AnalogCliSource = 'settings' | 'env' | 'path' | 'simantic-releases'

export type AnalogCliAvailability =
  | { status: 'found'; binaryPath: string; version: string | null; source: AnalogCliSource }
  | { status: 'not-found'; tried: string[]; message: string }

export type AnalogToolchainInfo = {
  cli: AnalogCliAvailability
  /** The run-history store root the CLI on this host writes to. */
  historyRoot: string
}

export const ANALOG_CLI_ENV = 'ANALOG_CLI'

export const ANALOG_ERROR_CODES = [
  'analog_remote_unsupported',
  'analog_cli_not_found',
  'analog_run_not_found',
  'analog_dataset_not_found',
  'analog_dataset_too_large'
] as const

export type AnalogErrorCode = (typeof ANALOG_ERROR_CODES)[number]

/** analog-cli's process exit taxonomy (src/exit.rs). */
export const ANALOG_EXIT_CODE_LABELS: Record<number, string> = {
  0: 'passed',
  1: 'failed',
  2: 'bad project',
  3: 'kicad-cli missing',
  4: 'runner failure',
  6: 'invalid plan'
}

export type AnalogTargetKind = 'deck' | 'project'

export type AnalogReportSummary = {
  total: number
  passed: number
  failed: number
  errors: number
  skipped: number
  notImplemented: number
}

export type AnalogRunSummary = {
  id: string
  command: string
  argv: string[]
  name: string | null
  target: string | null
  targetKind: AnalogTargetKind | null
  cwd: string
  startedUnixMs: number
  wallElapsedSeconds: number
  exitCode: number
  session: string | null
  parent: string | null
  artifactCount: number
  datasetCount: number
  measurements: { total: number; passed: number; failed: number }
  reportSummary: AnalogReportSummary | null
  dir: string
}

export type AnalogDatasetInfo = {
  file: string
  name: string
  test: string | null
  tag: string | null
  sweepName: string
  rows: number
  rowsTotal: number | null
  columns: string[]
  path: string
}

export type AnalogMeasurement = {
  name: string
  value: number | null
  pass: boolean | null
  test: string | null
  point: string | null
  signals: string[]
}

export type AnalogRunManifest = AnalogRunSummary & {
  binary: string | null
  artifacts: string[]
  datasets: AnalogDatasetInfo[]
  measurementsList: AnalogMeasurement[]
  report: unknown
}

export type AnalogRunsListing = {
  historyRoot: string
  runs: AnalogRunSummary[]
  /** Run ids whose manifest could not be read; listed so a corrupt store is visible, not silent. */
  corrupt: string[]
}

export type AnalogSessionCall = {
  call: string
  session: string | null
  argv: string[]
  cwd: string
  binary: string | null
  startedUnixMs: number
  pid: number
  endedUnixMs: number | null
  exitCode: number | null
  elapsedMs: number | null
  historyId: string | null
  inFlight: boolean
}

export type AnalogDatasetSeries = {
  sweepName: string
  x: (number | null)[]
  series: { name: string; y: (number | null)[] }[]
  rowsRead: number
  decimated: boolean
}

export type AnalogWatchEvent =
  | { type: 'ready' }
  | { type: 'changed'; kind: 'runs' | 'calls' }
  | { type: 'end' }

export const ANALOG_DATASET_MAX_COLUMNS = 32
export const ANALOG_DATASET_MAX_BUCKETS = 4000
export const ANALOG_DATASET_DEFAULT_BUCKETS = 1000
export const ANALOG_RUNS_MAX_LIMIT = 200
