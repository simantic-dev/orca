import { ExternalLink } from 'lucide-react'
import type { AnalogRunManifest } from '../../../../../shared/analog-cli-types'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { openAnalogArtifact } from './analog-artifact-open'

type AnalogRunArtifactsSectionProps = { manifest: AnalogRunManifest; worktreeId: string }

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export function AnalogRunArtifactsSection({
  manifest,
  worktreeId
}: AnalogRunArtifactsSectionProps): React.JSX.Element {
  const rows = [
    ...manifest.artifacts.map((path) => ({
      path,
      kind: translate(
        'auto.components.editor.analog.run.AnalogRunArtifactsSection.e8dcebc2f1',
        'report'
      )
    })),
    ...manifest.datasets.map((dataset) => ({
      path: dataset.path,
      kind: translate(
        'auto.components.editor.analog.run.AnalogRunArtifactsSection.cf176b61fe',
        'dataset'
      )
    }))
  ]
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {translate(
          'auto.components.editor.analog.run.AnalogRunArtifactsSection.3d7c9957f4',
          'This run wrote no files.'
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {translate(
          'auto.components.editor.analog.run.AnalogRunArtifactsSection.c226960176',
          'Reports next to the project can be overwritten by a later run; datasets live in the run history.'
        )}
      </p>
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map((row) => (
          <li key={row.path} className="flex items-center gap-3 px-3 py-2 text-xs">
            <span className="w-14 shrink-0 text-muted-foreground">{row.kind}</span>
            <span className="min-w-0 flex-1 truncate font-mono" title={row.path}>
              {fileName(row.path)}
            </span>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => void openAnalogArtifact(worktreeId, row.path)}
            >
              <ExternalLink />
              {translate(
                'auto.components.editor.analog.run.AnalogRunArtifactsSection.8ad8d59857',
                'Open'
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
