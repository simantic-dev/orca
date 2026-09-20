import type { ProcessResult, ProcessSpec } from '../../shared/child-process/process-spec'

export type ToolVersionProbe =
  | { ok: true; version: string; major: number }
  | { ok: false; message: string }

export type ToolProcessRunner = (spec: ProcessSpec) => Promise<ProcessResult>

const VERSION_RE = /(\d+)\.(\d+)(?:\.(\d+))?/

/** Runs `<program> <args>` and reads the first dotted version out of its output. */
export async function probeToolVersion(
  run: ToolProcessRunner,
  program: string,
  args: readonly string[],
  timeoutMs: number
): Promise<ToolVersionProbe> {
  let result: ProcessResult
  try {
    result = await run({ program, args, timeoutMs, maxOutputBytes: 64 * 1024 })
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
  if (result.timedOut) {
    return { ok: false, message: `${program} did not answer within ${timeoutMs}ms` }
  }
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim()
    return { ok: false, message: detail || `${program} exited with code ${result.code}` }
  }
  const match = VERSION_RE.exec(result.stdout) ?? VERSION_RE.exec(result.stderr)
  if (!match) {
    return { ok: false, message: `${program} printed no version` }
  }
  return { ok: true, version: match[0], major: Number(match[1]) }
}
