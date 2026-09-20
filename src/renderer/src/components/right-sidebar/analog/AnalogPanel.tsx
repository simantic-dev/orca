import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { useActiveWorktreeId } from '@/store/selectors'
import { selectAnalogWorktreeState, useAnalogRunsStore } from '@/store/analog-runs'
import { translate } from '@/i18n/i18n'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { activateTabAndFocusPane } from '@/lib/activate-tab-and-focus-pane'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { AnalogRunSummary } from '../../../../../shared/analog-cli-types'
import { AnalogEmptyState } from './AnalogEmptyState'
import { AnalogPanelHeader } from './AnalogPanelHeader'
import { AnalogRunRow } from './AnalogRunRow'
import { AnalogSessionGroupHeader } from './AnalogSessionGroupHeader'
import { buildAnalogRows, groupAnalogRows } from './analog-run-grouping'
import { copyAnalogCommand, rerunAnalogInNewTerminal } from './analog-run-rerun'
import { useAnalogPanelData } from './use-analog-panel-data'

type AnalogPanelProps = { isVisible: boolean }

export default function AnalogPanel({ isVisible }: AnalogPanelProps): React.JSX.Element {
  const worktreeId = useActiveWorktreeId()
  useAnalogPanelData(worktreeId, isVisible)
  const entry = useAnalogRunsStore(selectAnalogWorktreeState(worktreeId))
  const refresh = useAnalogRunsStore((state) => state.refresh)
  const forgetRun = useAnalogRunsStore((state) => state.forgetRun)
  const agentStatusByPaneKey = useAppStore((state) => state.agentStatusByPaneKey)
  const openAnalogRun = useAppStore((state) => state.openAnalogRun)
  const [pendingForget, setPendingForget] = useState<AnalogRunSummary | null>(null)
  const groups = useMemo(
    () => groupAnalogRows(buildAnalogRows(entry.runs, entry.calls)),
    [entry.calls, entry.runs]
  )
  const cliFound = entry.toolchain?.cli.status === 'found'

  const jumpToPane = (tabId: string, leafId: string): void => {
    if (!worktreeId || !activateAndRevealWorktree(worktreeId)) {
      return
    }
    useAppStore.getState().setActiveTabType('terminal')
    activateTabAndFocusPane(tabId, leafId, { flashFocusedPane: true })
  }

  const body = (() => {
    if (!worktreeId) {
      return <AnalogEmptyState variant="no-runs" />
    }
    if (entry.unsupported === 'remote') {
      return <AnalogEmptyState variant="remote-unsupported" />
    }
    if (entry.unsupported === 'unresolved') {
      return <AnalogEmptyState variant="unresolved" />
    }
    if (!entry.loaded && entry.loading) {
      return <AnalogEmptyState variant="loading" />
    }
    if (entry.error) {
      return (
        <AnalogEmptyState
          variant="error"
          message={entry.error}
          onRetry={() => void refresh(worktreeId)}
        />
      )
    }
    if (groups.length === 0) {
      return (
        <AnalogEmptyState
          variant={entry.toolchain && !cliFound ? 'not-found' : 'no-runs'}
          onRetry={() => void refresh(worktreeId)}
        />
      )
    }
    return (
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-auto">
        {groups.map((group) => (
          <div key={group.session ?? '__other__'}>
            <AnalogSessionGroupHeader
              session={group.session}
              agentStatusByPaneKey={agentStatusByPaneKey}
              onJumpToPane={jumpToPane}
            />
            {group.rows.map((row) => (
              <AnalogRunRow
                key={row.key}
                row={row}
                canRerun={cliFound}
                onOpen={() => {
                  if (row.kind === 'run') {
                    openAnalogRun(worktreeId, row.run)
                  }
                }}
                onRerun={() => {
                  if (row.kind === 'run') {
                    rerunAnalogInNewTerminal(worktreeId, row.run)
                  }
                }}
                onCopyCommand={() => {
                  if (row.kind === 'run') {
                    void copyAnalogCommand(worktreeId, row.run)
                  }
                }}
                onReveal={() => {
                  if (row.kind === 'run') {
                    void window.api.shell.openPath(row.run.dir)
                  }
                }}
                onForget={() => {
                  if (row.kind === 'run') {
                    setPendingForget(row.run)
                  }
                }}
              />
            ))}
          </div>
        ))}
        {entry.corrupt.length > 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {translate(
              'auto.components.right.sidebar.analog.AnalogPanel.7903498578',
              '{{value0}} run(s) in the store could not be read.',
              { value0: entry.corrupt.length }
            )}
          </div>
        ) : null}
      </div>
    )
  })()

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <AnalogPanelHeader
        loading={entry.loading}
        historyRoot={entry.toolchain?.historyRoot ?? null}
        onRefresh={() => {
          if (worktreeId) {
            void refresh(worktreeId)
          }
        }}
      />
      {body}
      <Dialog
        open={pendingForget !== null}
        onOpenChange={(open) => !open && setPendingForget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate(
                'auto.components.right.sidebar.analog.AnalogPanel.b6f48903a9',
                'Forget this run?'
              )}
            </DialogTitle>
            <DialogDescription>
              {translate(
                'auto.components.right.sidebar.analog.AnalogPanel.cea0f27654',
                'analog-cli deletes the recorded manifest and datasets. Report files written next to the project are kept.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingForget(null)}>
              {translate('auto.components.right.sidebar.analog.AnalogPanel.6ba8d28753', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const run = pendingForget
                setPendingForget(null)
                if (run && worktreeId) {
                  forgetRun(worktreeId, run.id).catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : String(error))
                  })
                }
              }}
            >
              {translate('auto.components.right.sidebar.analog.AnalogPanel.e6e94c7d64', 'Forget')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
