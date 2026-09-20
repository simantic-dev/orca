import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseAnalogSessionLog, readAnalogSessionLog } from './analog-session-log'

const START = (call: string, extra = '') =>
  `{"schema":"analog-cli.session-call/1","event":"start","call":"${call}","session":"leaf","argv":["analog-cli","test","-p","b"],"cwd":"/w","binary":"/bin/analog-cli","started_unix_ms":${call.split('-')[0]},"pid":${call.split('-')[1]}${extra}}`
const END = (call: string, historyId?: string) =>
  `{"schema":"analog-cli.session-call/1","event":"end","call":"${call}","session":"leaf","exit_code":1,"elapsed_ms":412,"ended_unix_ms":9${historyId ? `,"history_id":"${historyId}"` : ''}}`

describe('analog session log', () => {
  it('joins interleaved start/end lines, flags calls in flight, and skips a partial last line', () => {
    const text = [
      START('100-1'),
      START('200-2'),
      END('100-1', '20260915-073649-947-8822'),
      '{"event":"start","call":"300-3","argv":["x"'
    ].join('\n')
    const calls = parseAnalogSessionLog(text)
    expect(calls.map((call) => [call.call, call.inFlight, call.historyId, call.exitCode])).toEqual([
      ['100-1', false, '20260915-073649-947-8822', 1],
      ['200-2', true, null, null]
    ])
    expect(calls[0]).toMatchObject({
      session: 'leaf',
      argv: ['analog-cli', 'test', '-p', 'b'],
      cwd: '/w',
      pid: 1
    })
  })

  it('reads the tail of a large log and returns nothing for a missing file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'analog-log-'))
    try {
      const path = join(dir, 'calls.jsonl')
      const lines: string[] = []
      for (let index = 0; index < 50; index += 1) {
        lines.push(START(`${1000 + index}-${index}`), END(`${1000 + index}-${index}`))
      }
      await writeFile(path, `${lines.join('\n')}\n`)
      const tail = await readAnalogSessionLog(path, { maxBytes: 600 })
      expect(tail.length).toBeGreaterThan(0)
      expect(tail.length).toBeLessThan(50)
      expect(tail.every((call) => !call.inFlight || call.startedUnixMs > 1000)).toBe(true)
      expect(await readAnalogSessionLog(join(dir, 'missing.jsonl'))).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
