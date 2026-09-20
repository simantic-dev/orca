import { getConnectionId } from '@/lib/connection-context'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import { useAppStore } from '@/store'

export type LocalHardwareHostResolution =
  | { kind: 'local' }
  | { kind: 'unsupported'; reason: 'ssh' | 'runtime' }
  | { kind: 'unresolved' }

/** v1 of the hardware tooling (KiCad viewer, analog-cli runs) works on the local host only. */
export function resolveLocalHardwareHost(worktreeId: string): LocalHardwareHostResolution {
  const connectionId = getConnectionId(worktreeId)
  if (connectionId === undefined) {
    return { kind: 'unresolved' }
  }
  if (connectionId) {
    return { kind: 'unsupported', reason: 'ssh' }
  }
  if (getRuntimeEnvironmentIdForWorktree(useAppStore.getState(), worktreeId)) {
    return { kind: 'unsupported', reason: 'runtime' }
  }
  return { kind: 'local' }
}
