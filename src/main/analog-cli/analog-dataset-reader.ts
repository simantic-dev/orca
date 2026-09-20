import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { ANALOG_DATASET_MAX_COLUMNS, type AnalogDatasetSeries } from '../../shared/analog-cli-types'

const MAX_DATASET_BYTES = 64 * 1024 * 1024

/** analog-cli writes `inf`, `-inf` and `nan` for non-finite samples; charts want gaps there. */
export function parseAnalogSample(token: string): number | null {
  const trimmed = token.trim()
  if (trimmed === '' || trimmed === 'nan' || trimmed === 'inf' || trimmed === '-inf') {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

type Row = { x: number | null; y: (number | null)[] }

/**
 * Keeps every series' extremes per bucket (plus bucket edges), so spikes survive downsampling and
 * the payload stays bounded by the bucket count rather than the row count.
 */
export function decimateAnalogRows(
  rows: Row[],
  buckets: number
): { rows: Row[]; decimated: boolean } {
  if (rows.length <= buckets * 2) {
    return { rows, decimated: false }
  }
  const bucketSize = rows.length / buckets
  const keep = new Set<number>()
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor(bucket * bucketSize)
    const end = Math.min(rows.length, Math.floor((bucket + 1) * bucketSize))
    if (start >= end) {
      continue
    }
    keep.add(start)
    keep.add(end - 1)
    const seriesCount = rows[start]?.y.length ?? 0
    for (let series = 0; series < seriesCount; series += 1) {
      let minIndex = -1
      let maxIndex = -1
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (let index = start; index < end; index += 1) {
        const value = rows[index]?.y[series]
        if (value === null || value === undefined) {
          continue
        }
        if (value < min) {
          min = value
          minIndex = index
        }
        if (value > max) {
          max = value
          maxIndex = index
        }
      }
      if (minIndex !== -1) {
        keep.add(minIndex)
      }
      if (maxIndex !== -1) {
        keep.add(maxIndex)
      }
    }
  }
  const indexes = [...keep].sort((a, b) => a - b)
  return { rows: indexes.map((index) => rows[index]!), decimated: true }
}

function splitCsvLine(line: string): string[] {
  return line.split(',')
}

export async function readAnalogDataset(
  path: string,
  options: { columns?: readonly string[]; buckets: number }
): Promise<AnalogDatasetSeries> {
  let size: number
  try {
    size = (await stat(path)).size
  } catch {
    throw new Error('analog_dataset_not_found')
  }
  if (size > MAX_DATASET_BYTES) {
    throw new Error('analog_dataset_too_large')
  }
  const lines = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity
  })
  let header: string[] | null = null
  let selected: { name: string; index: number }[] = []
  const rows: Row[] = []
  for await (const line of lines) {
    if (header === null) {
      header = splitCsvLine(line).map((cell) => cell.trim())
      const wanted = options.columns
      const candidates = header.slice(1).map((name, offset) => ({ name, index: offset + 1 }))
      selected = (
        wanted ? candidates.filter((column) => wanted.includes(column.name)) : candidates
      ).slice(0, ANALOG_DATASET_MAX_COLUMNS)
      continue
    }
    if (line.trim() === '') {
      continue
    }
    const cells = splitCsvLine(line)
    rows.push({
      x: parseAnalogSample(cells[0] ?? ''),
      y: selected.map((column) => parseAnalogSample(cells[column.index] ?? ''))
    })
  }
  const { rows: kept, decimated } = decimateAnalogRows(rows, options.buckets)
  return {
    sweepName: header?.[0] ?? '',
    x: kept.map((row) => row.x),
    series: selected.map((column, seriesIndex) => ({
      name: column.name,
      y: kept.map((row) => row.y[seriesIndex] ?? null)
    })),
    rowsRead: rows.length,
    decimated
  }
}
