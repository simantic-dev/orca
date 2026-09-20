import type {
  AnalogDatasetSeries,
  AnalogRunManifest,
  AnalogRunsListing,
  AnalogSessionCall,
  AnalogToolchainInfo,
  AnalogWatchEvent
} from '../../../shared/analog-cli-types'
import { callRuntimeRpc } from './runtime-rpc-client'
import { toRuntimeWorktreeSelector } from './runtime-worktree-selector'

const LOCAL = { kind: 'local' } as const
const CALL_TIMEOUT_MS = 20_000

function params(worktreeId: string, rest: Record<string, unknown> = {}) {
  return { worktree: toRuntimeWorktreeSelector(worktreeId), ...rest }
}

export function getAnalogToolchain(refresh = false): Promise<AnalogToolchainInfo> {
  return callRuntimeRpc<AnalogToolchainInfo>(
    LOCAL,
    'analog.toolchain',
    { refresh },
    { timeoutMs: CALL_TIMEOUT_MS }
  )
}

export function listAnalogRuns(
  worktreeId: string,
  scope: 'workspace' | 'all',
  limit: number
): Promise<AnalogRunsListing> {
  return callRuntimeRpc<AnalogRunsListing>(
    LOCAL,
    'analog.listRuns',
    params(worktreeId, { scope, limit }),
    {
      timeoutMs: CALL_TIMEOUT_MS
    }
  )
}

export function getAnalogRun(worktreeId: string, historyId: string): Promise<AnalogRunManifest> {
  return callRuntimeRpc<AnalogRunManifest>(
    LOCAL,
    'analog.getRun',
    params(worktreeId, { historyId }),
    {
      timeoutMs: CALL_TIMEOUT_MS
    }
  )
}

export function readAnalogDataset(
  worktreeId: string,
  historyId: string,
  file: string,
  options: { columns?: string[]; buckets?: number } = {}
): Promise<AnalogDatasetSeries> {
  return callRuntimeRpc<AnalogDatasetSeries>(
    LOCAL,
    'analog.readDataset',
    params(worktreeId, { historyId, file, ...options }),
    { timeoutMs: 60_000 }
  )
}

export function listAnalogSessionCalls(
  worktreeId: string
): Promise<{ calls: AnalogSessionCall[] }> {
  return callRuntimeRpc<{ calls: AnalogSessionCall[] }>(
    LOCAL,
    'analog.listSessionCalls',
    params(worktreeId),
    {
      timeoutMs: CALL_TIMEOUT_MS
    }
  )
}

export function forgetAnalogRun(worktreeId: string, historyId: string): Promise<{ ok: true }> {
  return callRuntimeRpc<{ ok: true }>(
    LOCAL,
    'analog.forgetRun',
    params(worktreeId, { historyId }),
    {
      timeoutMs: CALL_TIMEOUT_MS
    }
  )
}

function isAnalogWatchEvent(value: unknown): value is AnalogWatchEvent {
  return (
    typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
  )
}

/** Streams store/session-log change notices for a workspace until unsubscribed. */
export async function subscribeAnalogChanges(
  worktreeId: string,
  handlers: { onEvent: (event: AnalogWatchEvent) => void; onError: (error: unknown) => void }
): Promise<{ unsubscribe: () => void }> {
  return window.api.runtime.subscribe(
    { method: 'analog.watch', params: params(worktreeId) },
    (response) => {
      if (!response.ok) {
        handlers.onError(response.error)
        return
      }
      if (isAnalogWatchEvent(response.result)) {
        handlers.onEvent(response.result)
      }
    }
  )
}

/** The host answers with a stable code as the message (or a structured code); anything else is prose. */
export function analogErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }
  if ('code' in error && typeof error.code === 'string' && error.code.startsWith('analog_')) {
    return error.code
  }
  if (
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.startsWith('analog_')
  ) {
    return error.message
  }
  return null
}
