import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SettingsRow } from './SettingsFormControls'

export type HardwareToolStatus =
  | { kind: 'checking' }
  | { kind: 'found'; version: string | null; binaryPath: string; sourceLabel: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'too-old'; message: string }
  | { kind: 'error'; message: string }

type HardwareToolPathRowProps = {
  label: string
  description: string
  placeholder: string
  configuredPath: string | null
  status: HardwareToolStatus
  refreshing: boolean
  onSave: (path: string | null) => Promise<void>
  onRefresh: () => Promise<void>
}

function StatusIcon({ status }: { status: HardwareToolStatus }): React.JSX.Element {
  if (status.kind === 'checking') {
    return <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
  }
  if (status.kind === 'found') {
    return <CheckCircle2 className="size-3.5 shrink-0 text-status-success" />
  }
  return <CircleAlert className="size-3.5 shrink-0 text-destructive" />
}

function statusLabel(status: HardwareToolStatus): string {
  switch (status.kind) {
    case 'checking':
      return translate('auto.components.settings.HardwareToolPathRow.49bbb69ac3', 'Checking')
    case 'found':
      return status.version
        ? translate('auto.components.settings.HardwareToolPathRow.f5bd730e56', 'Found {{value0}}', {
            value0: status.version
          })
        : translate('auto.components.settings.HardwareToolPathRow.97f120b9fe', 'Found')
    case 'too-old':
      return translate('auto.components.settings.HardwareToolPathRow.6324b55785', 'Too old')
    case 'not-found':
      return translate('auto.components.settings.HardwareToolPathRow.1c23205504', 'Not found')
    case 'error':
      return translate('auto.components.settings.HardwareToolPathRow.eab6363d9d', 'Error')
  }
}

function statusDetail(status: HardwareToolStatus): React.ReactNode {
  if (status.kind === 'found') {
    return (
      <>
        <code className="rounded bg-muted px-1 py-0.5">{status.binaryPath}</code>{' '}
        <span>({status.sourceLabel})</span>
      </>
    )
  }
  if (status.kind === 'checking') {
    return null
  }
  return status.message
}

export function HardwareToolPathRow({
  label,
  description,
  placeholder,
  configuredPath,
  status,
  refreshing,
  onSave,
  onRefresh
}: HardwareToolPathRowProps): React.JSX.Element {
  const [draft, setDraft] = useState(configuredPath ?? '')
  useEffect(() => {
    setDraft(configuredPath ?? '')
  }, [configuredPath])
  const dirty = draft.trim() !== (configuredPath ?? '')

  const commit = async (): Promise<void> => {
    const next = draft.trim()
    if (next === (configuredPath ?? '')) {
      return
    }
    await onSave(next === '' ? null : next)
  }

  return (
    <SettingsRow
      alignTop
      label={label}
      description={
        <span className="block space-y-1">
          <span className="block">{description}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusIcon status={status} />
            <span className="font-medium text-foreground">{statusLabel(status)}</span>
            <span className="min-w-0 break-all">{statusDetail(status)}</span>
          </span>
        </span>
      }
      control={
        <div className="flex w-72 max-w-full items-center gap-1">
          <Input
            value={draft}
            placeholder={placeholder}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commit()
              }
            }}
            aria-label={label}
          />
          {configuredPath || dirty ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft('')
                void onSave(null)
              }}
            >
              {translate('auto.components.settings.HardwareToolPathRow.d4f2ec6a25', 'Clear')}
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={refreshing}
            aria-label={translate(
              'auto.components.settings.HardwareToolPathRow.e99c77267d',
              'Re-detect'
            )}
            onClick={() => void onRefresh()}
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
          </Button>
        </div>
      }
    />
  )
}
