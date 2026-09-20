import { create } from 'zustand'
import type {
  AnalogRunSummary,
  AnalogSessionCall,
  AnalogToolchainInfo
} from '../../../shared/analog-cli-types'
import type { CheckStatus } from '../../../shared/github/pull-request-types'
import {
  analogErrorCode,
  forgetAnalogRun,
  getAnalogToolchain,
  listAnalogRuns,
  listAnalogSessionCalls
} from '@/runtime/analog-runs-client'
import { resolveLocalHardwareHost } from '@/runtime/local-hardware-host'

export type AnalogRunsScope = 'workspace' | 'all'

export type AnalogWorktreeState = {
  toolchain: AnalogToolchainInfo | null
  runs: AnalogRunSummary[]
  calls: AnalogSessionCall[]
  corrupt: string[]
  loading: boolean
  loaded: boolean
  error: string | null
  unsupported: 'remote' | 'unresolved' | null
}

type AnalogRunsState = {
  byWorktree: Record<string, AnalogWorktreeState>
  scope: AnalogRunsScope
  lastViewedRunIdByWorktree: Record<string, string | null>
  refresh: (worktreeId: string) => Promise<void>
  setScope: (scope: AnalogRunsScope) => void
  markViewed: (worktreeId: string) => void
  forgetRun: (worktreeId: string, historyId: string) => Promise<void>
}

const RUNS_LIMIT = 100

export const EMPTY_ANALOG_WORKTREE_STATE: AnalogWorktreeState = {
  toolchain: null,
  runs: [],
  calls: [],
  corrupt: [],
  loading: false,
  loaded: false,
  error: null,
  unsupported: null
}

const generations = new Map<string, number>()

function describeError(error: unknown): string {
  const code = analogErrorCode(error)
  if (code) {
    return code
  }
  return error instanceof Error ? error.message : String(error)
}

/** Standalone like the plugin-panel store: the sidebar and the run tab read it, nothing persists. */
export const useAnalogRunsStore = create<AnalogRunsState>()((set, get) => ({
  byWorktree: {},
  scope: 'workspace',
  lastViewedRunIdByWorktree: {},

  setScope: (scope) => set({ scope }),

  markViewed: (worktreeId) => {
    const newest = get().byWorktree[worktreeId]?.runs[0]?.id ?? null
    set((state) => ({
      lastViewedRunIdByWorktree: { ...state.lastViewedRunIdByWorktree, [worktreeId]: newest }
    }))
  },

  refresh: async (worktreeId) => {
    const generation = (generations.get(worktreeId) ?? 0) + 1
    generations.set(worktreeId, generation)
    const patch = (next: Partial<AnalogWorktreeState>): void => {
      if (generations.get(worktreeId) !== generation) {
        return
      }
      set((state) => ({
        byWorktree: {
          ...state.byWorktree,
          [worktreeId]: {
            ...(state.byWorktree[worktreeId] ?? EMPTY_ANALOG_WORKTREE_STATE),
            ...next
          }
        }
      }))
    }
    const host = resolveLocalHardwareHost(worktreeId)
    if (host.kind !== 'local') {
      patch({
        loading: false,
        loaded: true,
        unsupported: host.kind === 'unsupported' ? 'remote' : 'unresolved'
      })
      return
    }
    patch({ loading: true, unsupported: null })
    const current = get().byWorktree[worktreeId]
    try {
      const [listing, sessions, toolchain] = await Promise.all([
        listAnalogRuns(worktreeId, get().scope, RUNS_LIMIT),
        listAnalogSessionCalls(worktreeId),
        current?.toolchain ? Promise.resolve(current.toolchain) : getAnalogToolchain()
      ])
      patch({
        toolchain,
        runs: listing.runs,
        calls: sessions.calls,
        corrupt: listing.corrupt,
        loading: false,
        loaded: true,
        error: null
      })
    } catch (error) {
      const code = analogErrorCode(error)
      patch({
        loading: false,
        loaded: true,
        error: code === 'analog_remote_unsupported' ? null : describeError(error),
        unsupported: code === 'analog_remote_unsupported' ? 'remote' : null
      })
    }
  },

  forgetRun: async (worktreeId, historyId) => {
    await forgetAnalogRun(worktreeId, historyId)
    set((state) => {
      const entry = state.byWorktree[worktreeId]
      if (!entry) {
        return state
      }
      return {
        byWorktree: {
          ...state.byWorktree,
          [worktreeId]: { ...entry, runs: entry.runs.filter((run) => run.id !== historyId) }
        }
      }
    })
  }
}))

export function selectAnalogWorktreeState(worktreeId: string | null) {
  return (state: AnalogRunsState): AnalogWorktreeState =>
    (worktreeId ? state.byWorktree[worktreeId] : undefined) ?? EMPTY_ANALOG_WORKTREE_STATE
}

/** Pending while a call is in flight; failure until the newest failed run has been looked at. */
export function selectAnalogActivityIndicator(
  state: AnalogRunsState,
  worktreeId: string | null
): CheckStatus | null {
  if (!worktreeId) {
    return null
  }
  const entry = state.byWorktree[worktreeId]
  if (!entry) {
    return null
  }
  if (entry.calls.some((call) => call.inFlight)) {
    return 'pending'
  }
  const newest = entry.runs[0]
  if (
    newest &&
    newest.exitCode !== 0 &&
    state.lastViewedRunIdByWorktree[worktreeId] !== newest.id
  ) {
    return 'failure'
  }
  return null
}

export function useAnalogActivityIndicator(worktreeId: string | null): CheckStatus | null {
  return useAnalogRunsStore((state) => selectAnalogActivityIndicator(state, worktreeId))
}
