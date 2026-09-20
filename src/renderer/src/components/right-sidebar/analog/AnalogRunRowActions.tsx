import { Copy, FolderOpen, MoreHorizontal, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'

type AnalogRunRowActionsProps = {
  onRerun: () => void
  onCopyCommand: () => void
  onReveal: () => void
  onForget: () => void
  canRerun: boolean
  canForget: boolean
}

export function AnalogRunRowActions({
  onRerun,
  onCopyCommand,
  onReveal,
  onForget,
  canRerun,
  canForget
}: AnalogRunRowActionsProps): React.JSX.Element {
  // Why: the trigger only shows on hover/focus or while its menu is open, so rows stay quiet.
  return (
    <span className="flex opacity-0 group-hover/analog-row:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={translate(
              'auto.components.right.sidebar.analog.AnalogRunRowActions.f76f16c433',
              'Run actions'
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem disabled={!canRerun} onSelect={onRerun}>
            <Play />
            {translate(
              'auto.components.right.sidebar.analog.AnalogRunRowActions.53845013c7',
              'Re-run in a new terminal'
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyCommand}>
            <Copy />
            {translate(
              'auto.components.right.sidebar.analog.AnalogRunRowActions.b94e14d708',
              'Copy command'
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onReveal}>
            <FolderOpen />
            {translate(
              'auto.components.right.sidebar.analog.AnalogRunRowActions.d7c9a28148',
              'Reveal run folder'
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canForget} variant="destructive" onSelect={onForget}>
            <Trash2 />
            {translate(
              'auto.components.right.sidebar.analog.AnalogRunRowActions.394f8257f2',
              'Forget run…'
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}
