import { join } from 'node:path'

/** Where analog-cli records runs on this host: `$ANALOG_CLI_HISTORY_DIR` → `$XDG_STATE_HOME/analog-cli/history` → `~/.local/state/analog-cli/history`. */
export function resolveAnalogHistoryRoot(env: NodeJS.ProcessEnv, homeDir: string): string {
  const explicit = env.ANALOG_CLI_HISTORY_DIR?.trim()
  if (explicit) {
    return explicit
  }
  const stateHome = env.XDG_STATE_HOME?.trim()
  const base = stateHome ? stateHome : join(homeDir, '.local', 'state')
  return join(base, 'analog-cli', 'history')
}
