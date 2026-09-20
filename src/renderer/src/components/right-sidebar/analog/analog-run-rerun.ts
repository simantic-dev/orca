import { toast } from 'sonner'
import type { AnalogRunSummary } from '../../../../../shared/analog-cli-types'
import { buildShellCommandFromArgv } from '../../../../../shared/tui-agent-startup-shell'
import { translate } from '@/i18n/i18n'
import { resolveAiVaultResumeStartupShell } from '@/lib/ai-vault-resume-shell'
import { isWindowsUserAgent } from '@/components/terminal-pane/pane-helpers'
import { useAppStore } from '@/store'

/** The recorded invocation, quoted for the shell a new local terminal will run, from the run's cwd. */
export function analogRerunCommand(worktreeId: string, run: AnalogRunSummary): string {
  const state = useAppStore.getState()
  const shell = resolveAiVaultResumeStartupShell({
    state,
    worktreeId,
    platform: isWindowsUserAgent() ? 'win32' : 'darwin',
    isLocalSession: true
  })
  const binary = run.argv[0] === 'analog-cli' ? 'analog-cli' : (run.argv[0] ?? 'analog-cli')
  const invocation = buildShellCommandFromArgv([binary, ...run.argv.slice(1)], shell)
  const changeDir = buildShellCommandFromArgv(['cd', run.cwd], shell)
  return `${changeDir} && ${invocation}`
}

export function rerunAnalogInNewTerminal(worktreeId: string, run: AnalogRunSummary): void {
  const store = useAppStore.getState()
  const groupId = store.activeGroupIdByWorktree[worktreeId] ?? undefined
  const shell = resolveAiVaultResumeStartupShell({
    state: store,
    worktreeId,
    platform: isWindowsUserAgent() ? 'win32' : 'darwin',
    isLocalSession: true
  })
  const tab = store.createTab(worktreeId, groupId, undefined, {
    quickCommandLabel: `analog-cli ${run.command.replace('/', ' ')}`,
    startupCwd: run.cwd
  })
  store.queueTabStartupCommand(tab.id, {
    command: buildShellCommandFromArgv(['analog-cli', ...run.argv.slice(1)], shell)
  })
  store.setActiveTabType('terminal')
}

export async function copyAnalogCommand(worktreeId: string, run: AnalogRunSummary): Promise<void> {
  try {
    await navigator.clipboard.writeText(analogRerunCommand(worktreeId, run))
    toast.success(
      translate(
        'auto.components.right.sidebar.analog.analog.run.rerun.69b2cbaa1e',
        'Command copied'
      )
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error))
  }
}
