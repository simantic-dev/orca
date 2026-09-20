import { useMemo } from 'react'
import type { AnalogDatasetSeries } from '../../../../../shared/analog-cli-types'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { AnalogUplotChart, type AnalogChartSeries } from './AnalogUplotChart'
import { analogSeriesStyle } from './analog-series-palette'

type AnalogWaveformLanesProps = {
  data: AnalogDatasetSeries
  /** All columns of the dataset, in file order: a signal keeps its hue whatever is selected. */
  columns: string[]
  selected: string[]
  syncKey: string
}

const LANE_HEIGHT = 170

function useIsDarkTheme(): boolean {
  const theme = useAppStore((state) => state.settings?.theme)
  return (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
}

/** One signal per lane over one shared x axis, the way a logic analyzer stacks channels. */
export function AnalogWaveformLanes({
  data,
  columns,
  selected,
  syncKey
}: AnalogWaveformLanesProps): React.JSX.Element {
  const isDark = useIsDarkTheme()
  const lanes = useMemo(() => {
    const rows = data.x
      .map((value, index) => ({ value, index }))
      .filter((row): row is { value: number; index: number } => row.value !== null)
    const x = rows.map((row) => row.value)
    const logX = data.sweepName === 'frequency' && x.length > 0 && x.every((value) => value > 0)
    const result: { name: string; series: AnalogChartSeries; logX: boolean; x: number[] }[] = []
    for (const name of selected) {
      const entry = data.series.find((candidate) => candidate.name === name)
      if (!entry) {
        continue
      }
      const style = analogSeriesStyle(Math.max(0, columns.indexOf(name)), isDark)
      result.push({
        name,
        logX,
        x,
        series: { name, y: rows.map((row) => entry.y[row.index] ?? null), ...style }
      })
    }
    return result
  }, [columns, data, isDark, selected])

  if (lanes.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {translate(
          'auto.components.editor.analog.run.AnalogWaveformLanes.38b4b652b9',
          'Pick signals to plot.'
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {lanes.map((lane) => (
        <AnalogUplotChart
          key={lane.name}
          xLabel={data.sweepName}
          x={lane.x}
          series={[lane.series]}
          logX={lane.logX}
          height={LANE_HEIGHT}
          syncKey={syncKey}
        />
      ))}
    </div>
  )
}
