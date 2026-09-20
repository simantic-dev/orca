import { Copy, FolderOpen, Loader2, Play, RefreshCw } from 'lucide-react'
import { ANALOG_EXIT_CODE_LABELS } from '../../../../../shared/analog-cli-types'
import type { CheckStatus } from '../../../../../shared/github/pull-request-types'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { translate } from '@/i18n/i18n'
import type { OpenAnalogRunState } from '@/store/slices/editor/types/analog-run-tab-state'
import { analogCommandLabel, analogRunVerdict } from '../../right-sidebar/analog/analog-verdict'
import {
  copyAnalogCommand,
  rerunAnalogInNewTerminal
} from '../../right-sidebar/analog/analog-run-rerun'
import { AnalogRunArtifactsSection } from './AnalogRunArtifactsSection'
import { AnalogRunDatasetsSection } from './AnalogRunDatasetsSection'
import { AnalogRunReportSection } from './AnalogRunReportSection'
import { AnalogRunSummarySection } from './AnalogRunSummarySection'

type AnalogRunViewProps = {
  fileId: string
  run: OpenAnalogRunState
  onReload: () => void
}

function VerdictDot({ tone }: { tone: CheckStatus }): React.JSX.Element {
  if (tone === 'success') {
    return <span className="size-2.5 shrink-0 rounded-full bg-status-success" />
  }
  if (tone === 'failure') {
    return <span className="size-2.5 shrink-0 rounded-full bg-destructive" />
  }
  return <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground" />
}

const SCROLL_CLASS = 'scrollbar-sleek h-full min-h-0 overflow-auto px-4 py-3'

export default function AnalogRunView({
  fileId,
  run,
  onReload
}: AnalogRunViewProps): React.JSX.Element {
  const { summary, manifest, worktreeId } = run
  const verdict = analogRunVerdict(summary)
  const started = new Date(summary.startedUnixMs)
  const exitLabel = ANALOG_EXIT_CODE_LABELS[summary.exitCode] ?? `exit ${summary.exitCode}`
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <VerdictDot tone={verdict.tone} />
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {analogCommandLabel(summary.command)}
            {summary.name ? ` · ${summary.name}` : ''}
          </span>
          <span className="text-xs text-muted-foreground">{verdict.label}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => rerunAnalogInNewTerminal(worktreeId, summary)}
            >
              <Play />
              {translate('auto.components.editor.analog.run.AnalogRunView.1b723bb184', 'Re-run')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => void copyAnalogCommand(worktreeId, summary)}
            >
              <Copy />
              {translate(
                'auto.components.editor.analog.run.AnalogRunView.ba34bc4bae',
                'Copy command'
              )}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => void window.api.shell.openPath(summary.dir)}
            >
              <FolderOpen />
              {translate(
                'auto.components.editor.analog.run.AnalogRunView.9271487879',
                'Run folder'
              )}
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={translate(
                'auto.components.editor.analog.run.AnalogRunView.6f1c98d113',
                'Reload'
              )}
              disabled={run.loading}
              onClick={onReload}
            >
              {run.loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{started.toLocaleString()}</span>
          <span>
            {translate(
              'auto.components.editor.analog.run.AnalogRunView.ab33d1a677',
              '{{value0}} s',
              { value0: summary.wallElapsedSeconds.toFixed(2) }
            )}
          </span>
          <span>{exitLabel}</span>
          <span className="truncate font-mono" title={summary.argv.join(' ')}>
            {summary.argv.join(' ')}
          </span>
        </div>
      </div>
      {run.error ? (
        <div className="px-4 py-3 text-sm text-destructive">{run.error}</div>
      ) : !manifest ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="summary">
              {translate('auto.components.editor.analog.run.AnalogRunView.ed0380d881', 'Summary')}
            </TabsTrigger>
            <TabsTrigger value="datasets">
              {translate('auto.components.editor.analog.run.AnalogRunView.6759652b9d', 'Datasets')}
            </TabsTrigger>
            <TabsTrigger value="artifacts">
              {translate('auto.components.editor.analog.run.AnalogRunView.b3f139b138', 'Artifacts')}
            </TabsTrigger>
            <TabsTrigger value="report">
              {translate('auto.components.editor.analog.run.AnalogRunView.ffdd13d429', 'Report')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="min-h-0 flex-1">
            <div className={SCROLL_CLASS}>
              <AnalogRunSummarySection manifest={manifest} />
            </div>
          </TabsContent>
          <TabsContent value="datasets" className="min-h-0 flex-1">
            <div className={SCROLL_CLASS}>
              <AnalogRunDatasetsSection manifest={manifest} worktreeId={worktreeId} />
            </div>
          </TabsContent>
          <TabsContent value="artifacts" className="min-h-0 flex-1">
            <div className={SCROLL_CLASS}>
              <AnalogRunArtifactsSection manifest={manifest} worktreeId={worktreeId} />
            </div>
          </TabsContent>
          <TabsContent value="report" className="min-h-0 flex-1">
            <AnalogRunReportSection fileId={fileId} report={manifest.report} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
