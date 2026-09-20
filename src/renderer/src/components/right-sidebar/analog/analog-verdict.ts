import {
  ANALOG_EXIT_CODE_LABELS,
  type AnalogRunSummary
} from '../../../../../shared/analog-cli-types'
import type { CheckStatus } from '../../../../../shared/github/pull-request-types'
import { translate } from '@/i18n/i18n'

export type AnalogVerdict = { label: string; tone: CheckStatus }

/** Exit code plus the report summary, spelled the way a reviewer scans a list. */
export function analogRunVerdict(
  run: Pick<AnalogRunSummary, 'exitCode' | 'reportSummary' | 'measurements'>
): AnalogVerdict {
  const summary = run.reportSummary
  if (run.exitCode === 0) {
    return {
      tone: 'success',
      label: summary
        ? translate(
            'auto.components.right.sidebar.analog.analog.verdict.cb1b08d68a',
            'passed {{value0}}/{{value1}}',
            { value0: summary.passed, value1: summary.total }
          )
        : translate('auto.components.right.sidebar.analog.analog.verdict.48b8e8322f', 'passed')
    }
  }
  if (run.exitCode === 1) {
    const failed = summary ? summary.failed + summary.errors : run.measurements.failed
    const total = summary ? summary.total : run.measurements.total
    return {
      tone: 'failure',
      label:
        total > 0
          ? translate(
              'auto.components.right.sidebar.analog.analog.verdict.479558cfd3',
              'failed {{value0}}/{{value1}}',
              { value0: failed, value1: total }
            )
          : translate('auto.components.right.sidebar.analog.analog.verdict.3b50dc00f1', 'failed')
    }
  }
  const known = ANALOG_EXIT_CODE_LABELS[run.exitCode]
  return {
    tone: 'failure',
    label:
      known ??
      translate(
        'auto.components.right.sidebar.analog.analog.verdict.da0bfc4947',
        'exit {{value0}}',
        { value0: run.exitCode }
      )
  }
}

/** `analyze/tran` → `analyze tran`. */
export function analogCommandLabel(command: string): string {
  return command.replace('/', ' ')
}
