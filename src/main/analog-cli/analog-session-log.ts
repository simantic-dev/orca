import { open, stat } from 'node:fs/promises'
import type { AnalogSessionCall } from '../../shared/analog-cli-types'

const DEFAULT_MAX_BYTES = 4 * 1024 * 1024

type StartLine = {
  call: string
  session?: string
  argv: string[]
  cwd: string
  binary?: string
  started_unix_ms: number
  pid: number
}

type EndLine = {
  call: string
  session?: string
  exit_code: number
  elapsed_ms: number
  ended_unix_ms: number
  history_id?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStart(record: Record<string, unknown>): StartLine | null {
  if (
    typeof record.call !== 'string' ||
    !Array.isArray(record.argv) ||
    typeof record.cwd !== 'string' ||
    typeof record.started_unix_ms !== 'number' ||
    typeof record.pid !== 'number'
  ) {
    return null
  }
  return {
    call: record.call,
    session: typeof record.session === 'string' ? record.session : undefined,
    argv: record.argv.filter((item): item is string => typeof item === 'string'),
    cwd: record.cwd,
    binary: typeof record.binary === 'string' ? record.binary : undefined,
    started_unix_ms: record.started_unix_ms,
    pid: record.pid
  }
}

function asEnd(record: Record<string, unknown>): EndLine | null {
  if (
    typeof record.call !== 'string' ||
    typeof record.exit_code !== 'number' ||
    typeof record.elapsed_ms !== 'number' ||
    typeof record.ended_unix_ms !== 'number'
  ) {
    return null
  }
  return {
    call: record.call,
    session: typeof record.session === 'string' ? record.session : undefined,
    exit_code: record.exit_code,
    elapsed_ms: record.elapsed_ms,
    ended_unix_ms: record.ended_unix_ms,
    history_id: typeof record.history_id === 'string' ? record.history_id : undefined
  }
}

/** Joins `start`/`end` lines by `call`; a start with no end yet is a call still running. */
export function parseAnalogSessionLog(text: string): AnalogSessionCall[] {
  const starts = new Map<string, StartLine>()
  const ends = new Map<string, EndLine>()
  const order: string[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      // Why: the CLI appends whole lines, so a partial last line is a write in progress, not corruption.
      continue
    }
    if (!isRecord(parsed)) {
      continue
    }
    if (parsed.event === 'start') {
      const start = asStart(parsed)
      if (start && !starts.has(start.call)) {
        starts.set(start.call, start)
        order.push(start.call)
      }
    } else if (parsed.event === 'end') {
      const end = asEnd(parsed)
      if (end) {
        ends.set(end.call, end)
      }
    }
  }
  return order.map((call) => {
    const start = starts.get(call)!
    const end = ends.get(call) ?? null
    return {
      call,
      session: start.session ?? end?.session ?? null,
      argv: start.argv,
      cwd: start.cwd,
      binary: start.binary ?? null,
      startedUnixMs: start.started_unix_ms,
      pid: start.pid,
      endedUnixMs: end?.ended_unix_ms ?? null,
      exitCode: end?.exit_code ?? null,
      elapsedMs: end?.elapsed_ms ?? null,
      historyId: end?.history_id ?? null,
      inFlight: end === null
    }
  })
}

/** Reads the log (or its tail past `maxBytes`); a missing file is simply no calls yet. */
export async function readAnalogSessionLog(
  path: string,
  options: { maxBytes?: number } = {}
): Promise<AnalogSessionCall[]> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  let size: number
  try {
    size = (await stat(path)).size
  } catch {
    return []
  }
  const handle = await open(path, 'r')
  try {
    const offset = Math.max(0, size - maxBytes)
    const length = size - offset
    const buffer = Buffer.alloc(length)
    const { bytesRead } = await handle.read(buffer, 0, length, offset)
    let text = buffer.subarray(0, bytesRead).toString('utf8')
    if (offset > 0) {
      text = text.slice(text.indexOf('\n') + 1)
    }
    return parseAnalogSessionLog(text)
  } finally {
    await handle.close()
  }
}
