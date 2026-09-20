import { watch, type FSWatcher } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

export type AnalogStoreChangeKind = 'runs' | 'calls'

const DEBOUNCE_MS = 250
const POLL_MS = 5_000

/**
 * Watches the run-history store and the workspace session log. A run directory appears before its
 * `run.json` lands, so the recursive watch (or the poll fallback) reports both steps; the debounce
 * folds them into one change.
 */
export async function watchAnalogStore(args: {
  historyRoot: string
  sessionLogPath: string
  signal: AbortSignal
  onChange: (kind: AnalogStoreChangeKind) => void
}): Promise<void> {
  const watchers: FSWatcher[] = []
  const timers = new Map<AnalogStoreChangeKind, ReturnType<typeof setTimeout>>()
  const emit = (kind: AnalogStoreChangeKind): void => {
    const pending = timers.get(kind)
    if (pending) {
      clearTimeout(pending)
    }
    timers.set(
      kind,
      setTimeout(() => {
        timers.delete(kind)
        if (!args.signal.aborted) {
          args.onChange(kind)
        }
      }, DEBOUNCE_MS)
    )
  }
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const tryWatch = (
    path: string,
    listener: (eventType: string, fileName: string | null) => void
  ): boolean => {
    try {
      const watcher = watch(path, { recursive: true, persistent: false }, (eventType, fileName) =>
        listener(eventType, typeof fileName === 'string' ? fileName : null)
      )
      watcher.on('error', () => {
        startPolling()
      })
      watchers.push(watcher)
      return true
    } catch {
      return false
    }
  }
  const mtimes = new Map<string, number>()
  const poll = async (): Promise<void> => {
    for (const [path, kind] of [
      [args.historyRoot, 'runs'],
      [args.sessionLogPath, 'calls']
    ] as const) {
      let mtime = 0
      try {
        mtime = (await stat(path)).mtimeMs
      } catch {
        mtime = 0
      }
      const previous = mtimes.get(path)
      mtimes.set(path, mtime)
      if (previous !== undefined && previous !== mtime) {
        emit(kind)
      }
    }
  }
  const startPolling = (): void => {
    if (pollTimer || args.signal.aborted) {
      return
    }
    void poll()
    pollTimer = setInterval(() => void poll(), POLL_MS)
  }

  await mkdir(args.historyRoot, { recursive: true }).catch(() => undefined)
  await mkdir(dirname(args.sessionLogPath), { recursive: true }).catch(() => undefined)
  const runsWatched = tryWatch(args.historyRoot, () => emit('runs'))
  const logName = basename(args.sessionLogPath)
  const callsWatched = tryWatch(dirname(args.sessionLogPath), (_eventType, fileName) => {
    if (fileName === null || fileName === logName) {
      emit('calls')
    }
  })
  if (!runsWatched || !callsWatched) {
    startPolling()
  }

  await new Promise<void>((resolve) => {
    const finish = (): void => {
      for (const watcher of watchers) {
        watcher.close()
      }
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      if (pollTimer) {
        clearInterval(pollTimer)
      }
      resolve()
    }
    if (args.signal.aborted) {
      finish()
      return
    }
    args.signal.addEventListener('abort', finish, { once: true })
  })
}
