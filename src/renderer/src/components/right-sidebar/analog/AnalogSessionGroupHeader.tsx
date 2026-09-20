import { SquareTerminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import {
  describeAnalogSessionPane,
  resolveAnalogSessionPane,
  type AnalogSessionAgentFacets
} from './analog-session-agent-resolution'

type AnalogSessionGroupHeaderProps = {
  session: string | null
  agentStatusByPaneKey: Record<string, AnalogSessionAgentFacets>
  onJumpToPane: (tabId: string, leafId: string) => void
}

function stateLabel(entry: AnalogSessionAgentFacets | undefined): string | null {
  if (!entry) {
    return null
  }
  if (entry.state === 'working') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.f4fe32aab6',
      'working'
    )
  }
  if (entry.state === 'blocked') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.1bf6fcc155',
      'blocked'
    )
  }
  if (entry.state === 'waiting') {
    return translate(
      'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.3940335e89',
      'waiting'
    )
  }
  return translate(
    'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.8c2791b47e',
    'idle'
  )
}

export function AnalogSessionGroupHeader({
  session,
  agentStatusByPaneKey,
  onJumpToPane
}: AnalogSessionGroupHeaderProps): React.JSX.Element {
  const pane = session ? resolveAnalogSessionPane(agentStatusByPaneKey, session) : null
  const described = describeAnalogSessionPane(pane)
  const title = session
    ? described.title ||
      translate(
        'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.99236fd436',
        'Terminal'
      )
    : translate(
        'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.33fcd4ca8b',
        'Other terminals'
      )
  const state = stateLabel(pane?.entry)
  return (
    <div className="flex min-w-0 items-center gap-2 bg-sidebar px-3 py-1.5 text-xs">
      <span className="truncate font-medium text-foreground">{title}</span>
      {state ? <span className="shrink-0 text-muted-foreground">· {state}</span> : null}
      {described.detail ? (
        <span className="min-w-0 flex-1 truncate text-muted-foreground" title={described.detail}>
          {described.detail}
        </span>
      ) : (
        <span className="flex-1" />
      )}
      {pane ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={translate(
            'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.5986e9a399',
            'Jump to terminal'
          )}
          title={translate(
            'auto.components.right.sidebar.analog.AnalogSessionGroupHeader.5986e9a399',
            'Jump to terminal'
          )}
          onClick={() => onJumpToPane(pane.tabId, pane.leafId)}
        >
          <SquareTerminal />
        </Button>
      ) : null}
    </div>
  )
}
