import { z } from 'zod'
import type {
  AnalogMeasurement,
  AnalogReportSummary,
  AnalogRunManifest,
  AnalogRunSummary,
  AnalogTargetKind
} from '../../shared/analog-cli-types'

// Lenient on purpose: the CLI's contract is "additive within /1", so unknown fields must pass.
const datasetSchema = z.looseObject({
  file: z.string(),
  name: z.string(),
  test: z.string().optional(),
  tag: z.string().optional(),
  sweep_name: z.string(),
  rows: z.number(),
  rows_total: z.number().optional(),
  columns: z.array(z.string()).default([])
})

const measurementSchema = z.looseObject({
  name: z.string(),
  value: z.number().nullable().optional(),
  pass: z.boolean().nullable().optional(),
  test: z.string().optional(),
  point: z.string().optional(),
  signals: z.array(z.string()).optional()
})

export const analogRunManifestSchema = z.looseObject({
  schema: z.string().optional(),
  id: z.string(),
  cli_version: z.string().optional(),
  command: z.string(),
  argv: z.array(z.string()).default([]),
  binary: z.string().optional(),
  cwd: z.string(),
  target: z.string().optional(),
  target_kind: z.string().optional(),
  name: z.string().optional(),
  started_unix_ms: z.number(),
  wall_elapsed_seconds: z.number().default(0),
  exit_code: z.number(),
  parent: z.string().optional(),
  session: z.string().optional(),
  artifacts: z.array(z.string()).default([]),
  datasets: z.array(datasetSchema).default([]),
  measurements: z.array(measurementSchema).default([]),
  report: z.unknown().optional()
})

export type ParsedAnalogRunManifest = z.infer<typeof analogRunManifestSchema>

function targetKind(value: string | undefined): AnalogTargetKind | null {
  return value === 'deck' || value === 'project' ? value : null
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function reportSummary(report: unknown): AnalogReportSummary | null {
  if (typeof report !== 'object' || report === null || !('summary' in report)) {
    return null
  }
  const summary = report.summary
  if (typeof summary !== 'object' || summary === null) {
    return null
  }
  const record: Record<string, unknown> = { ...summary }
  return {
    total: numberField(record, 'total'),
    passed: numberField(record, 'passed'),
    failed: numberField(record, 'failed'),
    errors: numberField(record, 'errors'),
    skipped: numberField(record, 'skipped'),
    notImplemented: numberField(record, 'not_implemented')
  }
}

export function toAnalogRunSummary(
  manifest: ParsedAnalogRunManifest,
  dir: string
): AnalogRunSummary {
  const passed = manifest.measurements.filter((measurement) => measurement.pass === true).length
  const failed = manifest.measurements.filter((measurement) => measurement.pass === false).length
  return {
    id: manifest.id,
    command: manifest.command,
    argv: manifest.argv,
    name: manifest.name ?? null,
    target: manifest.target ?? null,
    targetKind: targetKind(manifest.target_kind),
    cwd: manifest.cwd,
    startedUnixMs: manifest.started_unix_ms,
    wallElapsedSeconds: manifest.wall_elapsed_seconds,
    exitCode: manifest.exit_code,
    session: manifest.session ?? null,
    parent: manifest.parent ?? null,
    artifactCount: manifest.artifacts.length,
    datasetCount: manifest.datasets.length,
    measurements: { total: manifest.measurements.length, passed, failed },
    reportSummary: reportSummary(manifest.report),
    dir
  }
}

export function toAnalogRunManifest(
  manifest: ParsedAnalogRunManifest,
  dir: string,
  joinPath: (dir: string, file: string) => string
): AnalogRunManifest {
  const measurementsList: AnalogMeasurement[] = manifest.measurements.map((measurement) => ({
    name: measurement.name,
    value: measurement.value ?? null,
    pass: measurement.pass ?? null,
    test: measurement.test ?? null,
    point: measurement.point ?? null,
    signals: measurement.signals ?? []
  }))
  return {
    ...toAnalogRunSummary(manifest, dir),
    binary: manifest.binary ?? null,
    artifacts: manifest.artifacts,
    datasets: manifest.datasets.map((dataset) => ({
      file: dataset.file,
      name: dataset.name,
      test: dataset.test ?? null,
      tag: dataset.tag ?? null,
      sweepName: dataset.sweep_name,
      rows: dataset.rows,
      rowsTotal: dataset.rows_total ?? null,
      columns: dataset.columns,
      path: joinPath(dir, dataset.file)
    })),
    measurementsList,
    report: manifest.report ?? null
  }
}
