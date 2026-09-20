import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { translate } from '@/i18n/i18n'
import type { KicadViewerView } from './kicad-viewer-view-state'

type KicadViewerToolbarProps = {
  view: KicadViewerView
  onViewChange: (view: KicadViewerView) => void
  projectName: string
  hasPcb: boolean
  onRefresh: () => void
}

export function KicadViewerToolbar({
  view,
  onViewChange,
  projectName,
  hasPcb,
  onRefresh
}: KicadViewerToolbarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      <ToggleGroup
        type="single"
        size="sm"
        value={view}
        onValueChange={(next) => {
          if (next === 'schematic' || next === 'pcb' || next === 'pcb3d') {
            onViewChange(next)
          }
        }}
      >
        <ToggleGroupItem value="schematic">
          {translate('auto.components.editor.kicad.KicadViewerToolbar.f8710ff64a', 'Schematic')}
        </ToggleGroupItem>
        <ToggleGroupItem value="pcb" disabled={!hasPcb}>
          {translate('auto.components.editor.kicad.KicadViewerToolbar.10c18e4640', 'PCB')}
        </ToggleGroupItem>
        <ToggleGroupItem value="pcb3d" disabled={!hasPcb}>
          {translate('auto.components.editor.kicad.KicadViewerToolbar.45a2c886a6', '3D')}
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{projectName}</span>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={translate(
          'auto.components.editor.kicad.KicadViewerToolbar.c542d4629b',
          'Re-export from KiCad'
        )}
        title={translate(
          'auto.components.editor.kicad.KicadViewerToolbar.c542d4629b',
          'Re-export from KiCad'
        )}
        onClick={onRefresh}
      >
        <RefreshCw />
      </Button>
    </div>
  )
}
