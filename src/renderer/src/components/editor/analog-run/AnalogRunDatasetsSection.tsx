import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import type {
  AnalogDatasetInfo,
  AnalogDatasetSeries,
  AnalogRunManifest
} from '../../../../../shared/analog-cli-types'
import { readAnalogDataset } from '@/runtime/analog-runs-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { AnalogSignalPicker } from './AnalogSignalPicker'
import { AnalogWaveformLanes } from './AnalogWaveformLanes'
import { openAnalogArtifact } from './analog-artifact-open'
import { measuredSignalsForTest, parseAnalogTestReport } from './analog-report-parsing'

type AnalogRunDatasetsSectionProps = { manifest: AnalogRunManifest; worktreeId: string }

const DEFAULT_SIGNAL_COUNT = 8
// Why: signal names carry parentheses, slashes and dots; a unit separator never appears in one.
const SELECTION_SEPARATOR = String.fromCharCode(31)

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: AnalogDatasetSeries }
  | { status: 'error'; message: string }

function defaultSelection(dataset: AnalogDatasetInfo, measured: string[]): string[] {
  const present = measured.filter((name) => dataset.columns.includes(name))
  return present.length > 0 ? present : dataset.columns.slice(0, DEFAULT_SIGNAL_COUNT)
}

export function AnalogRunDatasetsSection({
  manifest,
  worktreeId
}: AnalogRunDatasetsSectionProps): React.JSX.Element {
  const report = useMemo(() => parseAnalogTestReport(manifest.report), [manifest.report])
  const [activeFile, setActiveFile] = useState<string | null>(manifest.datasets[0]?.file ?? null)
  const [selectionByFile, setSelectionByFile] = useState<Record<string, string[]>>({})
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const cache = useRef(new Map<string, AnalogDatasetSeries>())
  const dataset = manifest.datasets.find((candidate) => candidate.file === activeFile) ?? null
  const measured = useMemo(
    () => (dataset ? measuredSignalsForTest(report, dataset.test) : []),
    [dataset, report]
  )
  const selected = dataset
    ? (selectionByFile[dataset.file] ?? defaultSelection(dataset, measured))
    : []
  const selectedKey = selected.join(SELECTION_SEPARATOR)

  useEffect(() => {
    if (!dataset) {
      return
    }
    const columns = selectedKey === '' ? [] : selectedKey.split(SELECTION_SEPARATOR)
    if (columns.length === 0) {
      setLoad({
        status: 'ready',
        data: { sweepName: dataset.sweepName, x: [], series: [], rowsRead: 0, decimated: false }
      })
      return
    }
    const key = `${dataset.file}::${selectedKey}`
    const cached = cache.current.get(key)
    if (cached) {
      setLoad({ status: 'ready', data: cached })
      return
    }
    let cancelled = false
    setLoad({ status: 'loading' })
    readAnalogDataset(worktreeId, manifest.id, dataset.file, { columns })
      .then((data) => {
        cache.current.set(key, data)
        if (!cancelled) {
          setLoad({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoad({
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [dataset, manifest.id, selectedKey, worktreeId])

  if (manifest.datasets.length === 0 || !dataset) {
    return (
      <div className="text-sm text-muted-foreground">
        {translate(
          'auto.components.editor.analog.run.AnalogRunDatasetsSection.01c82a7850',
          'This run produced no datasets.'
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 gap-4">
      <div className="w-52 shrink-0 space-y-1">
        {manifest.datasets.map((candidate) => (
          <button
            key={candidate.file}
            type="button"
            className={cn(
              'flex w-full flex-col rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent',
              candidate.file === dataset.file && 'bg-accent'
            )}
            onClick={() => setActiveFile(candidate.file)}
          >
            <span className="truncate font-medium text-foreground">
              {candidate.name}
              {candidate.test ? ` · ${candidate.test}` : ''}
            </span>
            <span className="truncate text-muted-foreground">
              {candidate.tag ? `${candidate.tag} · ` : ''}
              {translate(
                'auto.components.editor.analog.run.AnalogRunDatasetsSection.5071428bde',
                '{{value0}} rows',
                { value0: candidate.rowsTotal ?? candidate.rows }
              )}
            </span>
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <AnalogSignalPicker
            columns={dataset.columns}
            selected={selected}
            measured={measured}
            onChange={(next) =>
              setSelectionByFile((current) => ({ ...current, [dataset.file]: next }))
            }
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void openAnalogArtifact(worktreeId, dataset.path)}
          >
            <FileSpreadsheet />
            {translate(
              'auto.components.editor.analog.run.AnalogRunDatasetsSection.d0d14b5f68',
              'Open CSV'
            )}
          </Button>
          {load.status === 'ready' && load.data.decimated ? (
            <span className="text-xs text-muted-foreground">
              {translate(
                'auto.components.editor.analog.run.AnalogRunDatasetsSection.e40a5cf3df',
                'Downsampled from {{value0}} rows; extremes are kept.',
                {
                  value0: load.data.rowsRead
                }
              )}
            </span>
          ) : null}
        </div>
        {load.status === 'loading' ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : load.status === 'error' ? (
          <div className="text-sm text-destructive">{load.message}</div>
        ) : (
          <AnalogWaveformLanes
            data={load.data}
            columns={dataset.columns}
            selected={selected}
            syncKey={`analog-run:${manifest.id}:${dataset.file}`}
          />
        )}
      </div>
    </div>
  )
}
