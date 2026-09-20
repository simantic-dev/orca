import { CircleAlert, CircuitBoard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'

export type KicadViewerEmptyStateVariant =
  | 'loading'
  | 'cli-not-found'
  | 'cli-too-old'
  | 'remote-unsupported'
  | 'no-pcb'
  | 'export-failed'
  | 'too-large'
  | 'project-error'
  | 'error'

type KicadViewerEmptyStateProps = {
  variant: KicadViewerEmptyStateVariant
  message?: string | null
  detail?: string | null
  onRetry?: () => void
  onLoadBoardOnly?: () => void
}

function title(variant: KicadViewerEmptyStateVariant): string {
  switch (variant) {
    case 'loading':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.1ab8e1da62',
        'Rendering with kicad-cli…'
      )
    case 'cli-not-found':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.ba7a3be20c',
        'kicad-cli was not found'
      )
    case 'cli-too-old':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.9ca1077f1f',
        'kicad-cli is too old'
      )
    case 'remote-unsupported':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.69a456c03b',
        'The KiCad viewer is not available on remote workspaces yet'
      )
    case 'no-pcb':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.c9e9ccfb7f',
        'This project has no board'
      )
    case 'export-failed':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.a1f6b0fb91',
        'kicad-cli could not export this view'
      )
    case 'too-large':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.8df763bd20',
        'The export is too large to display'
      )
    case 'project-error':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.caa7875712',
        'This is not a complete KiCad project'
      )
    case 'error':
      return translate(
        'auto.components.editor.kicad.KicadViewerEmptyState.889977382a',
        'The viewer hit an error'
      )
  }
}

function hint(variant: KicadViewerEmptyStateVariant): string | null {
  if (variant === 'cli-not-found') {
    return translate(
      'auto.components.editor.kicad.KicadViewerEmptyState.931b991460',
      'Install KiCad 8 or newer, or point Orca at kicad-cli in Settings › Hardware.'
    )
  }
  if (variant === 'cli-too-old') {
    return translate(
      'auto.components.editor.kicad.KicadViewerEmptyState.f03952ddb3',
      'Schematic and board exports need KiCad 8 or newer.'
    )
  }
  if (variant === 'remote-unsupported') {
    return translate(
      'auto.components.editor.kicad.KicadViewerEmptyState.b2c1266f75',
      'Open the project in a local workspace to view it.'
    )
  }
  if (variant === 'no-pcb') {
    return translate(
      'auto.components.editor.kicad.KicadViewerEmptyState.ce2fd02f38',
      'The schematic is still available; a .kicad_pcb next to the project enables the board views.'
    )
  }
  return null
}

export function KicadViewerEmptyState({
  variant,
  message,
  detail,
  onRetry,
  onLoadBoardOnly
}: KicadViewerEmptyStateProps): React.JSX.Element {
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const showSettings = variant === 'cli-not-found' || variant === 'cli-too-old'
  const hintText = hint(variant)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      {variant === 'loading' ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : variant === 'no-pcb' ? (
        <CircuitBoard className="size-6 text-muted-foreground" />
      ) : (
        <CircleAlert className="size-6 text-muted-foreground" />
      )}
      <div className="text-sm font-medium text-foreground">{title(variant)}</div>
      {hintText ? <div className="max-w-md text-xs text-muted-foreground">{hintText}</div> : null}
      {message ? (
        <div className="max-w-md break-words text-xs text-muted-foreground">{message}</div>
      ) : null}
      {detail ? (
        <details className="max-w-lg text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {translate(
              'auto.components.editor.kicad.KicadViewerEmptyState.c85ae12469',
              'Show kicad-cli output'
            )}
          </summary>
          <pre className="scrollbar-sleek mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted p-2 whitespace-pre-wrap">
            {detail}
          </pre>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {showSettings ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openSettingsTarget({ pane: 'hardware', repoId: null })}
          >
            {translate(
              'auto.components.editor.kicad.KicadViewerEmptyState.13a663122b',
              'Open Settings'
            )}
          </Button>
        ) : null}
        {onLoadBoardOnly ? (
          <Button type="button" size="sm" variant="outline" onClick={onLoadBoardOnly}>
            {translate(
              'auto.components.editor.kicad.KicadViewerEmptyState.3ed6629c43',
              'Load board only'
            )}
          </Button>
        ) : null}
        {onRetry && variant !== 'loading' && variant !== 'no-pcb' ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {translate('auto.components.editor.kicad.KicadViewerEmptyState.778cb9120a', 'Retry')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
