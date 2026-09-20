import { describe, expect, it } from 'vitest'
import { measuredSignalsForTest, parseAnalogTestReport } from './analog-report-parsing'

const REPORT = {
  schema: 'analog-cli.test-report/1',
  summary: { total: 1 },
  tests: [
    {
      name: 'rails-op',
      kind: 'op',
      status: 'fail',
      detail: 'one measurement out of bounds',
      measurements: [
        {
          name: 'out-dc',
          kind: 'value_at',
          signal: 'V(OUT)',
          measured: 1.597,
          expect: { eq: 1.6, tol: 0.02 },
          margin: 0.017,
          pass: true
        },
        { name: 'rail', signal: 'V(+3V3)', expect: { min: 3.2 }, pass: false },
        { bogus: true }
      ],
      findings: [
        {
          kind: 'pin_not_connected',
          severity: 'warning',
          description: 'U1 pin 4 floats',
          sheet: '/'
        }
      ]
    },
    { name: 'erc', kind: 'erc', status: 'pass' }
  ]
}

describe('parseAnalogTestReport', () => {
  it('reads tests, measurements and findings defensively and lists measured signals per test', () => {
    const parsed = parseAnalogTestReport(REPORT)
    expect(parsed?.tests.map((test) => test.name)).toEqual(['rails-op', 'erc'])
    expect(parsed?.tests[0]?.measurements).toHaveLength(2)
    expect(parsed?.tests[0]?.measurements[0]).toMatchObject({
      signal: 'V(OUT)',
      measured: 1.597,
      expect: { eq: 1.6, tol: 0.02, min: null, max: null },
      pass: true
    })
    expect(parsed?.tests[0]?.findings[0]).toEqual({
      kind: 'pin_not_connected',
      severity: 'warning',
      description: 'U1 pin 4 floats',
      sheet: '/'
    })
    expect(measuredSignalsForTest(parsed, 'rails-op')).toEqual(['V(OUT)', 'V(+3V3)'])
    expect(measuredSignalsForTest(parsed, 'erc')).toEqual([])
    expect(parseAnalogTestReport({ status: 'pass', timing: {} })).toBeNull()
  })
})
