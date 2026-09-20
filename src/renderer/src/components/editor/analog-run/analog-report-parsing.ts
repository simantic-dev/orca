export type AnalogTestMeasurement = {
  name: string
  kind: string | null
  signal: string | null
  measured: number | null
  expect: { min: number | null; max: number | null; eq: number | null; tol: number | null }
  margin: number | null
  pass: boolean | null
}

export type AnalogTestFinding = {
  kind: string
  severity: string
  description: string
  sheet: string | null
}

export type AnalogTestEntry = {
  name: string
  kind: string
  status: string
  detail: string | null
  measurements: AnalogTestMeasurement[]
  findings: AnalogTestFinding[]
}

export type AnalogTestReport = { tests: AnalogTestEntry[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function measurement(value: unknown): AnalogTestMeasurement | null {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null
  }
  const expect = isRecord(value.expect) ? value.expect : {}
  return {
    name: value.name,
    kind: str(value.kind),
    signal: str(value.signal),
    measured: num(value.measured),
    expect: {
      min: num(expect.min),
      max: num(expect.max),
      eq: num(expect.eq),
      tol: num(expect.tol)
    },
    margin: num(value.margin),
    pass: typeof value.pass === 'boolean' ? value.pass : null
  }
}

function finding(value: unknown): AnalogTestFinding | null {
  if (!isRecord(value) || typeof value.description !== 'string') {
    return null
  }
  return {
    kind: str(value.kind) ?? '',
    severity: str(value.severity) ?? 'info',
    description: value.description,
    sheet: str(value.sheet)
  }
}

/** Reads `analog-cli.test-report/1` defensively; anything else (simulate reports, older shapes) yields null. */
export function parseAnalogTestReport(report: unknown): AnalogTestReport | null {
  if (!isRecord(report) || !Array.isArray(report.tests)) {
    return null
  }
  const tests: AnalogTestEntry[] = []
  for (const entry of report.tests) {
    if (!isRecord(entry) || typeof entry.name !== 'string') {
      continue
    }
    tests.push({
      name: entry.name,
      kind: str(entry.kind) ?? '',
      status: str(entry.status) ?? '',
      detail: str(entry.detail),
      measurements: Array.isArray(entry.measurements)
        ? entry.measurements
            .map(measurement)
            .filter((item): item is AnalogTestMeasurement => item !== null)
        : [],
      findings: Array.isArray(entry.findings)
        ? entry.findings.map(finding).filter((item): item is AnalogTestFinding => item !== null)
        : []
    })
  }
  return { tests }
}

/** Signals the report measured in a given test, in report order: the natural default for its chart. */
export function measuredSignalsForTest(
  report: AnalogTestReport | null,
  test: string | null
): string[] {
  if (!report) {
    return []
  }
  const signals: string[] = []
  for (const entry of report.tests) {
    if (test !== null && entry.name !== test) {
      continue
    }
    for (const item of entry.measurements) {
      if (item.signal && !signals.includes(item.signal)) {
        signals.push(item.signal)
      }
    }
  }
  return signals
}
