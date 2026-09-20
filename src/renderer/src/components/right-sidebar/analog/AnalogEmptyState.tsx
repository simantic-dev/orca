import { CircleAlert, Loader2, AudioWaveform } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'

export type AnalogEmptyStateVariant =
  | 'loading'
  | 'not-found'
  | 'no-runs'
  | 'remote-unsupported'
  | 'unresolved'
  | 'error'

type AnalogEmptyStateProps = {
  variant: AnalogEmptyStateVariant
  message?: string | null
  onRetry?: () => void
}

function title(variant: AnalogEmptyStateVariant): string {
  if (variant === 'loading') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.1f54c58334',
      'Reading the run history…'
    )
  }
  if (variant === 'not-found') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.a80fb4f0c8',
      'analog-cli was not found'
    )
  }
  if (variant === 'no-runs') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.d01747fee2',
      'No simulation runs yet'
    )
  }
  if (variant === 'remote-unsupported') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.89e27a335a',
      'Analog runs are not available on remote workspaces yet'
    )
  }
  if (variant === 'unresolved') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.3a99d2ea63',
      'Waiting for the workspace host…'
    )
  }
  return translate(
    'auto.components.right.sidebar.analog.AnalogEmptyState.1221f3f5c3',
    'The run history could not be read'
  )
}

function hint(variant: AnalogEmptyStateVariant): string | null {
  if (variant === 'not-found') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.b69e30a1a5',
      'Runs already recorded still show here; set the binary in Settings › Hardware to re-run or forget them.'
    )
  }
  if (variant === 'no-runs') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogEmptyState.f47930c980',
      'Runs land here as agents call analog-cli from Orca terminals, e.g. analog-cli test -p <project> --format json -o report.json'
    )
  }
  return null
}

export function AnalogEmptyState({
  variant,
  message,
  onRetry
}: AnalogEmptyStateProps): React.JSX.Element {
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const hintText = hint(variant)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {variant === 'loading' || variant === 'unresolved' ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : variant === 'no-runs' ? (
        <AudioWaveform className="size-5 text-muted-foreground" />
      ) : (
        <CircleAlert className="size-5 text-muted-foreground" />
      )}
      <div className="text-sm font-medium text-foreground">{title(variant)}</div>
      {hintText ? <div className="max-w-xs text-xs text-muted-foreground">{hintText}</div> : null}
      {message ? (
        <div className="max-w-xs break-words text-xs text-muted-foreground">{message}</div>
      ) : null}
      <div className="flex gap-2">
        {variant === 'not-found' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openSettingsTarget({ pane: 'hardware', repoId: null })}
          >
            {translate(
              'auto.components.right.sidebar.analog.AnalogEmptyState.5cf5a19a98',
              'Open Settings'
            )}
          </Button>
        ) : null}
        {onRetry && (variant === 'error' || variant === 'no-runs') ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {translate(
              'auto.components.right.sidebar.analog.AnalogEmptyState.60e323d4ff',
              'Refresh'
            )}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
