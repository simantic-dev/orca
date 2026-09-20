import { describe, expect, it } from 'vitest'
import { analogCommandLabel, analogRunVerdict } from './analog-verdict'

const summary = { total: 7, passed: 6, failed: 1, errors: 0, skipped: 0, notImplemented: 0 }

describe('analogRunVerdict', () => {
  it('spells pass and fail counts from the report and names the CLI exit taxonomy', () => {
    expect(
      analogRunVerdict({
        exitCode: 0,
        reportSummary: summary,
        measurements: { total: 0, passed: 0, failed: 0 }
      })
    ).toEqual({
      tone: 'success',
      label: 'passed 6/7'
    })
    expect(
      analogRunVerdict({
        exitCode: 1,
        reportSummary: summary,
        measurements: { total: 0, passed: 0, failed: 0 }
      })
    ).toEqual({
      tone: 'failure',
      label: 'failed 1/7'
    })
    expect(
      analogRunVerdict({
        exitCode: 3,
        reportSummary: null,
        measurements: { total: 0, passed: 0, failed: 0 }
      })
    ).toEqual({
      tone: 'failure',
      label: 'kicad-cli missing'
    })
    expect(
      analogRunVerdict({
        exitCode: 0,
        reportSummary: null,
        measurements: { total: 0, passed: 0, failed: 0 }
      }).label
    ).toBe('passed')
    expect(analogCommandLabel('analyze/tran')).toBe('analyze tran')
  })
})
