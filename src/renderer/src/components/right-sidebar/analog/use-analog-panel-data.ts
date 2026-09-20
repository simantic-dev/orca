import { useEffect, useRef, useState } from 'react'
import { subscribeAnalogChanges } from '@/runtime/analog-runs-client'
import { useAnalogRunsStore } from '@/store/analog-runs'

const POLL_FALLBACK_MS = 30_000
const CHANGE_DEBOUNCE_MS = 300

/** Keeps the panel's workspace current: refresh on mount/scope, live updates while visible, poll otherwise. */
export function useAnalogPanelData(worktreeId: string | null, isVisible: boolean): void {
  const refresh = useAnalogRunsStore((state) => state.refresh)
  const scope = useAnalogRunsStore((state) => state.scope)
  const markViewed = useAnalogRunsStore((state) => state.markViewed)
  const loaded = useAnalogRunsStore((state) =>
    worktreeId ? state.byWorktree[worktreeId]?.loaded : false
  )
  const runsCount = useAnalogRunsStore((state) =>
    worktreeId ? state.byWorktree[worktreeId]?.runs.length : 0
  )
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Why: the live subscription can fail (older host, transport hiccup); polling then keeps the list honest.
  const [pollingFor, setPollingFor] = useState<string | null>(null)

  useEffect(() => {
    if (worktreeId) {
      void refresh(worktreeId)
    }
  }, [refresh, scope, worktreeId])

  useEffect(() => {
    if (!worktreeId || !isVisible) {
      return
    }
    let disposed = false
    let unsubscribe: (() => void) | null = null
    const scheduleRefresh = (): void => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
      }
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        void refresh(worktreeId)
      }, CHANGE_DEBOUNCE_MS)
    }
    subscribeAnalogChanges(worktreeId, {
      onEvent: (event) => {
        if (event.type === 'changed') {
          scheduleRefresh()
        }
      },
      onError: () => setPollingFor(worktreeId)
    })
      .then((handle) => {
        if (disposed) {
          handle.unsubscribe()
        } else {
          unsubscribe = handle.unsubscribe
        }
      })
      .catch(() => setPollingFor(worktreeId))
    return () => {
      disposed = true
      unsubscribe?.()
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
        refreshTimer.current = null
      }
    }
  }, [isVisible, refresh, worktreeId])

  useEffect(() => {
    if (!isVisible || !worktreeId || pollingFor !== worktreeId) {
      return
    }
    const timer = setInterval(() => void refresh(worktreeId), POLL_FALLBACK_MS)
    return () => clearInterval(timer)
  }, [isVisible, pollingFor, refresh, worktreeId])

  useEffect(() => {
    if (worktreeId && isVisible && loaded) {
      markViewed(worktreeId)
    }
  }, [isVisible, loaded, markViewed, runsCount, worktreeId])
}
