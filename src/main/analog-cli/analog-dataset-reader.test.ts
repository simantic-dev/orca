import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decimateAnalogRows, parseAnalogSample, readAnalogDataset } from './analog-dataset-reader'

const CSV = join(import.meta.dirname, '__fixtures__', '01-tran-bring-up.csv')

describe('analog dataset reader', () => {
  it('turns non-finite tokens into gaps', () => {
    expect(parseAnalogSample('1.5')).toBe(1.5)
    expect(parseAnalogSample('inf')).toBeNull()
    expect(parseAnalogSample('-inf')).toBeNull()
    expect(parseAnalogSample('nan')).toBeNull()
    expect(parseAnalogSample('')).toBeNull()
  })

  it('reads selected columns from the CSV with the sweep axis first', async () => {
    const series = await readAnalogDataset(CSV, { columns: ['V(/vout)'], buckets: 1000 })
    expect(series.sweepName).toBe('time')
    expect(series.x).toEqual([0, 1e-6, 2e-6, 3e-6])
    expect(series.series).toEqual([{ name: 'V(/vout)', y: [0, null, null, 1.1] }])
    expect(series.rowsRead).toBe(4)
    expect(series.decimated).toBe(false)
    await expect(readAnalogDataset('/nope.csv', { buckets: 10 })).rejects.toThrow(
      'analog_dataset_not_found'
    )
  })

  it('keeps every series extreme per bucket when downsampling', () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      x: index,
      y: [Math.sin(index / 10), index === 500 ? 1000 : 0]
    }))
    const { rows: kept, decimated } = decimateAnalogRows(rows, 50)
    expect(decimated).toBe(true)
    expect(kept.length).toBeLessThan(rows.length)
    expect(kept.some((row) => row.y[1] === 1000)).toBe(true)
    expect(kept[0]).toBe(rows[0])
    expect(kept.at(-1)).toBe(rows.at(-1))
    const xs = kept.map((row) => row.x)
    expect(xs).toEqual([...xs].sort((a, b) => Number(a) - Number(b)))
  })
})
