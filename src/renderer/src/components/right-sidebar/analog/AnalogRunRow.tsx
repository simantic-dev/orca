import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import type { CheckStatus } from '../../../../../shared/github/pull-request-types'
import type { AnalogRunRowModel } from './analog-run-grouping'
import { AnalogRunRowActions } from './AnalogRunRowActions'
import { analogCommandLabel, analogRunVerdict } from './analog-verdict'

type AnalogRunRowProps = {
  row: AnalogRunRowModel
  onOpen: () => void
  onRerun: () => void
  onCopyCommand: () => void
  onReveal: () => void
  onForget: () => void
  canRerun: boolean
}

function ToneDot({ tone }: { tone: CheckStatus }): React.JSX.Element {
  if (tone === 'success') {
    return <span className="size-2 shrink-0 rounded-full bg-status-success" />
  }
  if (tone === 'failure') {
    return <span className="size-2 shrink-0 rounded-full bg-destructive" />
  }
  return <span className="size-2 shrink-0 rounded-full bg-muted-foreground" />
}

function formatElapsed(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)} ms`
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`
  }
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
}

function useNow(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) {
      return
    }
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [enabled])
  return now
}

export function AnalogRunRow({
  row,
  onOpen,
  onRerun,
  onCopyCommand,
  onReveal,
  onForget,
  canRerun
}: AnalogRunRowProps): React.JSX.Element {
  const inFlight = row.kind === 'call' && row.call.inFlight
  const now = useNow(inFlight)
  const argv = row.kind === 'run' ? row.run.argv : row.call.argv
  const subcommand = argv[1] ?? ''
  const projectArg = (() => {
    const index = argv.findIndex((arg) => arg === '-p' || arg === '--path')
    return index === -1 ? null : (argv[index + 1] ?? null)
  })()
  const title =
    row.kind === 'run'
      ? `${analogCommandLabel(row.run.command)}${row.run.name ? ` · ${row.run.name}` : ''}`
      : `${subcommand}${projectArg ? ` · ${projectArg}` : ''}`
  const verdict =
    row.kind === 'run'
      ? analogRunVerdict(row.run)
      : inFlight
        ? {
            tone: 'pending' as const,
            label: translate(
              'auto.components.right.sidebar.analog.AnalogRunRow.7238bc39cc',
              'running'
            )
          }
        : {
            tone: 'failure' as const,
            label: translate(
              'auto.components.right.sidebar.analog.AnalogRunRow.ced266c532',
              'exit {{value0}}',
              { value0: row.call.exitCode ?? '?' }
            )
          }
  const elapsedSeconds =
    row.kind === 'run'
      ? row.run.wallElapsedSeconds
      : inFlight
        ? (now - row.call.startedUnixMs) / 1000
        : (row.call.elapsedMs ?? 0) / 1000
  const commandLine = argv.slice(1).join(' ')

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group/analog-row flex w-full min-w-0 flex-col gap-0.5 border-b border-sidebar-border px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/55',
        row.kind === 'run' ? 'cursor-pointer' : 'cursor-default'
      )}
      onClick={() => {
        if (row.kind === 'run') {
          onOpen()
        }
      }}
      onKeyDown={(event) => {
        if (row.kind === 'run' && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {inFlight ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ToneDot tone={verdict.tone} />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {title}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{verdict.label}</span>
        {row.kind === 'run' ? (
          <AnalogRunRowActions
            onRerun={onRerun}
            onCopyCommand={onCopyCommand}
            onReveal={onReveal}
            onForget={onForget}
            canRerun={canRerun}
            canForget={canRerun}
          />
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate font-mono" title={commandLine}>
          {commandLine}
        </span>
        <span className="shrink-0 tabular-nums">
          {formatElapsed(elapsedSeconds)} · {formatUiRelativeTime(row.startedUnixMs - now)}
        </span>
      </div>
    </div>
  )
}
