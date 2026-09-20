import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { readCssTokenColor } from '../kicad/read-css-token-color'

export type AnalogChartSeries = {
  name: string
  y: (number | null)[]
  stroke: string
  dash: number[]
}

type AnalogUplotChartProps = {
  xLabel: string
  x: number[]
  series: AnalogChartSeries[]
  logX: boolean
  height: number
  syncKey: string
}

/** One uPlot instance per lane; every lane in a tab shares the cursor through `syncKey`. */
export function AnalogUplotChart({
  xLabel,
  x,
  series,
  logX,
  height,
  syncKey
}: AnalogUplotChartProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }
    const axisColor = readCssTokenColor('--muted-foreground')
    const gridColor = readCssTokenColor('--border')
    const axis = {
      stroke: axisColor,
      grid: { stroke: gridColor, width: 1 },
      ticks: { stroke: gridColor, width: 1 },
      font: '11px system-ui, sans-serif'
    }
    const plot = new uPlot(
      {
        width: Math.max(1, host.clientWidth),
        height,
        scales: { x: { time: false, distr: logX ? 3 : 1 } },
        axes: [
          { ...axis, label: xLabel, labelFont: '11px system-ui, sans-serif' },
          { ...axis, size: 64 }
        ],
        series: [
          { label: xLabel },
          ...series.map((entry) => ({
            label: entry.name,
            stroke: entry.stroke,
            width: 2,
            ...(entry.dash.length > 0 ? { dash: entry.dash } : {}),
            spanGaps: false
          }))
        ],
        cursor: { sync: { key: syncKey }, drag: { x: true, y: false } },
        legend: { show: true, live: true }
      },
      [x, ...series.map((entry) => entry.y)],
      host
    )
    const observer = new ResizeObserver(() => {
      plot.setSize({ width: Math.max(1, host.clientWidth), height })
    })
    observer.observe(host)
    return () => {
      observer.disconnect()
      plot.destroy()
    }
  }, [height, logX, series, syncKey, x, xLabel])

  return <div ref={hostRef} className="analog-uplot w-full" />
}
