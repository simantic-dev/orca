import { FolderOpen, LoaderCircle, MoreHorizontal, RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useAnalogRunsStore, type AnalogRunsScope } from '@/store/analog-runs'

type AnalogPanelHeaderProps = {
  loading: boolean
  historyRoot: string | null
  onRefresh: () => void
}

export function AnalogPanelHeader({
  loading,
  historyRoot,
  onRefresh
}: AnalogPanelHeaderProps): React.JSX.Element {
  const scope = useAnalogRunsStore((state) => state.scope)
  const setScope = useAnalogRunsStore((state) => state.setScope)
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  return (
    <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
      <span className="text-[13px] font-medium text-foreground">
        {translate('auto.components.right.sidebar.analog.AnalogPanelHeader.a17fceb321', 'Analog')}
      </span>
      <ToggleGroup
        type="single"
        size="sm"
        value={scope}
        onValueChange={(next) => {
          if (next === 'workspace' || next === 'all') {
            setScope(next satisfies AnalogRunsScope)
          }
        }}
        className="ml-auto"
      >
        <ToggleGroupItem value="workspace">
          {translate(
            'auto.components.right.sidebar.analog.AnalogPanelHeader.53bc9e855c',
            'Workspace'
          )}
        </ToggleGroupItem>
        <ToggleGroupItem value="all">
          {translate('auto.components.right.sidebar.analog.AnalogPanelHeader.52ba2c4276', 'All')}
        </ToggleGroupItem>
      </ToggleGroup>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={translate(
          'auto.components.right.sidebar.analog.AnalogPanelHeader.f7e29c4f5d',
          'Refresh runs'
        )}
        disabled={loading}
        onClick={onRefresh}
      >
        {loading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={translate(
              'auto.components.right.sidebar.analog.AnalogPanelHeader.5150ed376e',
              'More'
            )}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!historyRoot}
            onSelect={() => {
              if (historyRoot) {
                void window.api.shell.openPath(historyRoot)
              }
            }}
          >
            <FolderOpen />
            {translate(
              'auto.components.right.sidebar.analog.AnalogPanelHeader.408c87ac9f',
              'Reveal run history folder'
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openSettingsTarget({ pane: 'hardware', repoId: null })}>
            <Settings2 />
            {translate(
              'auto.components.right.sidebar.analog.AnalogPanelHeader.c4e4a76498',
              'Hardware settings…'
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
