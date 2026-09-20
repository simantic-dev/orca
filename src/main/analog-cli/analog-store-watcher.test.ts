import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { watchAnalogStore } from './analog-store-watcher'

async function until(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('timed out')
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

describe('watchAnalogStore', () => {
  it('reports a new run directory and an appended session log, then stops on abort', async () => {
    const root = await mkdtemp(join(tmpdir(), 'analog-watch-'))
    const historyRoot = join(root, 'history')
    const sessionLogPath = join(root, 'sessions', 'w.jsonl')
    const kinds: string[] = []
    const controller = new AbortController()
    const watching = watchAnalogStore({
      historyRoot,
      sessionLogPath,
      signal: controller.signal,
      onChange: (kind) => kinds.push(kind)
    })
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await mkdir(join(historyRoot, '20260918-000000-000-0001'))
      await writeFile(join(historyRoot, '20260918-000000-000-0001', 'run.json'), '{}')
      await until(() => kinds.includes('runs'))
      await writeFile(sessionLogPath, '{"event":"start"}\n')
      await until(() => kinds.includes('calls'))
    } finally {
      controller.abort()
      await watching
      await rm(root, { recursive: true, force: true })
    }
    expect(kinds).toContain('runs')
    expect(kinds).toContain('calls')
  })
})
