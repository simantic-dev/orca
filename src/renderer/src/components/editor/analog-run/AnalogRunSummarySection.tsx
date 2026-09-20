import type { AnalogRunManifest } from '../../../../../shared/analog-cli-types'
import { translate } from '@/i18n/i18n'
import { parseAnalogTestReport } from './analog-report-parsing'

type AnalogRunSummarySectionProps = { manifest: AnalogRunManifest }

function formatNumber(value: number | null): string {
  if (value === null) {
    return '—'
  }
  if (value === 0) {
    return '0'
  }
  const magnitude = Math.abs(value)
  return magnitude >= 1e4 || magnitude < 1e-3 ? value.toExponential(3) : value.toPrecision(4)
}

function expectLabel(expect: {
  min: number | null
  max: number | null
  eq: number | null
  tol: number | null
}): string {
  if (expect.eq !== null) {
    return expect.tol !== null
      ? `= ${formatNumber(expect.eq)} ± ${formatNumber(expect.tol)}`
      : `= ${formatNumber(expect.eq)}`
  }
  const parts: string[] = []
  if (expect.min !== null) {
    parts.push(`≥ ${formatNumber(expect.min)}`)
  }
  if (expect.max !== null) {
    parts.push(`≤ ${formatNumber(expect.max)}`)
  }
  return parts.join(' ')
}

function PassCell({ pass }: { pass: boolean | null }): React.JSX.Element {
  if (pass === true) {
    return (
      <span className="text-status-success">
        {translate('auto.components.editor.analog.run.AnalogRunSummarySection.d6aae11e24', 'pass')}
      </span>
    )
  }
  if (pass === false) {
    return (
      <span className="text-destructive">
        {translate('auto.components.editor.analog.run.AnalogRunSummarySection.085181edf5', 'fail')}
      </span>
    )
  }
  return <span className="text-muted-foreground">—</span>
}

const CELL = 'px-2 py-1 text-left align-top'
const HEAD = 'px-2 py-1 text-left text-xs font-medium text-muted-foreground'

export function AnalogRunSummarySection({
  manifest
}: AnalogRunSummarySectionProps): React.JSX.Element {
  const report = parseAnalogTestReport(manifest.report)
  return (
    <div className="space-y-6">
      {report ? (
        report.tests.map((test) => (
          <section key={test.name} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{test.name}</span>
              <span className="text-xs text-muted-foreground">{test.kind}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{test.status}</span>
            </div>
            {test.detail ? (
              <div className="text-xs text-muted-foreground">{test.detail}</div>
            ) : null}
            {test.measurements.length > 0 ? (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className={HEAD}>
                      {translate(
                        'auto.components.editor.analog.run.AnalogRunSummarySection.4ec291c0b5',
                        'Measurement'
                      )}
                    </th>
                    <th className={HEAD}>
                      {translate(
                        'auto.components.editor.analog.run.AnalogRunSummarySection.80a48d03e0',
                        'Signal'
                      )}
                    </th>
                    <th className={HEAD}>
                      {translate(
                        'auto.components.editor.analog.run.AnalogRunSummarySection.45df689469',
                        'Measured'
                      )}
                    </th>
                    <th className={HEAD}>
                      {translate(
                        'auto.components.editor.analog.run.AnalogRunSummarySection.cbaf07068a',
                        'Expected'
                      )}
                    </th>
                    <th className={HEAD}>
                      {translate(
                        'auto.components.editor.analog.run.AnalogRunSummarySection.4c6d2f7f14',
                        'Margin'
                      )}
                    </th>
                    <th className={HEAD}>
                      {translate(
                        'auto.components.editor.analog.run.AnalogRunSummarySection.7fd088c19e',
                        'Result'
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {test.measurements.map((measurement) => (
                    <tr key={measurement.name} className="border-b border-border/50">
                      <td className={CELL}>
                        {measurement.name}
                        {measurement.kind ? (
                          <span className="ml-1 text-muted-foreground">{measurement.kind}</span>
                        ) : null}
                      </td>
                      <td className={`${CELL} font-mono`}>{measurement.signal ?? '—'}</td>
                      <td className={`${CELL} font-mono tabular-nums`}>
                        {formatNumber(measurement.measured)}
                      </td>
                      <td className={`${CELL} font-mono tabular-nums`}>
                        {expectLabel(measurement.expect)}
                      </td>
                      <td className={`${CELL} font-mono tabular-nums`}>
                        {formatNumber(measurement.margin)}
                      </td>
                      <td className={CELL}>
                        <PassCell pass={measurement.pass} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {test.findings.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {test.findings.map((finding) => (
                  <li
                    key={`${finding.kind}:${finding.sheet ?? ''}:${finding.description}`}
                    className="flex gap-2"
                  >
                    <span className="shrink-0 font-medium text-muted-foreground">
                      {finding.severity}
                    </span>
                    <span className="min-w-0 break-words">{finding.description}</span>
                    {finding.sheet ? (
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {finding.sheet}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))
      ) : manifest.measurementsList.length > 0 ? (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className={HEAD}>
                {translate(
                  'auto.components.editor.analog.run.AnalogRunSummarySection.4ec291c0b5',
                  'Measurement'
                )}
              </th>
              <th className={HEAD}>
                {translate(
                  'auto.components.editor.analog.run.AnalogRunSummarySection.75da3f0e5c',
                  'Test'
                )}
              </th>
              <th className={HEAD}>
                {translate(
                  'auto.components.editor.analog.run.AnalogRunSummarySection.d18a75805c',
                  'Value'
                )}
              </th>
              <th className={HEAD}>
                {translate(
                  'auto.components.editor.analog.run.AnalogRunSummarySection.7fd088c19e',
                  'Result'
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {manifest.measurementsList.map((measurement) => (
              <tr
                key={`${measurement.test ?? ''}:${measurement.point ?? ''}:${measurement.name}`}
                className="border-b border-border/50"
              >
                <td className={CELL}>{measurement.name}</td>
                <td className={CELL}>{measurement.test ?? measurement.point ?? '—'}</td>
                <td className={`${CELL} font-mono tabular-nums`}>
                  {formatNumber(measurement.value)}
                </td>
                <td className={CELL}>
                  <PassCell pass={measurement.pass} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-sm text-muted-foreground">
          {translate(
            'auto.components.editor.analog.run.AnalogRunSummarySection.365506c870',
            'This run recorded no measurements.'
          )}
        </div>
      )}
    </div>
  )
}
