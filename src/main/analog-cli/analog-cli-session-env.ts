import { join } from 'node:path'
import { parsePaneKey } from '../../shared/stable-pane-id'
import { hashWorktreeId } from '../terminal-history-id'

export const ANALOG_CLI_SESSION_ENV = 'ANALOG_CLI_SESSION'
export const ANALOG_CLI_SESSION_LOG_ENV = 'ANALOG_CLI_SESSION_LOG'

const SESSION_ID_MAX = 64

/** The CLI accepts 1–64 chars of [A-Za-z0-9._-]; a pane key is longer, so the leaf uuid stands for the pane. */
export function analogCliSessionIdFromPaneKey(paneKey: string): string {
  const parsed = parsePaneKey(paneKey)
  const raw = parsed ? parsed.leafId : paneKey.slice(-36)
  return raw.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, SESSION_ID_MAX)
}

/** One NDJSON log per workspace, outside the repository, so every pane's calls land in one place. */
export function analogCliSessionLogPath(userDataPath: string, worktreeId: string): string {
  return join(userDataPath, 'analog-cli', 'sessions', `${hashWorktreeId(worktreeId)}.jsonl`)
}

export function buildAnalogCliSessionEnv(args: {
  paneKey: string
  worktreeId: string
  isLocalHost: boolean
  userDataPath: string
}): Record<string, string> {
  const env: Record<string, string> = {
    [ANALOG_CLI_SESSION_ENV]: analogCliSessionIdFromPaneKey(args.paneKey)
  }
  // Why: the log path is a host filesystem path; a remote pane gets only the id until its host has a log.
  if (args.isLocalHost) {
    env[ANALOG_CLI_SESSION_LOG_ENV] = analogCliSessionLogPath(args.userDataPath, args.worktreeId)
  }
  return env
}

/**
 * Applies the attribution variables to a local PTY env that already carries the pane identity the
 * renderer injected (`ORCA_PANE_KEY`, `ORCA_WORKTREE_ID`); a spawn without them is left untouched.
 */
export function applyAnalogCliSessionEnv(
  baseEnv: Record<string, string>,
  userDataPath: string
): Record<string, string> {
  const paneKey = baseEnv.ORCA_PANE_KEY
  const worktreeId = baseEnv.ORCA_WORKTREE_ID
  if (!paneKey || !worktreeId) {
    return baseEnv
  }
  return Object.assign(
    baseEnv,
    buildAnalogCliSessionEnv({ paneKey, worktreeId, isLocalHost: true, userDataPath })
  )
}
