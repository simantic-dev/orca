import { describe, expect, it } from 'vitest'
import {
  ANALOG_MAX_PLOTTED_SERIES,
  ANALOG_SERIES_DARK,
  ANALOG_SERIES_DASHES,
  ANALOG_SERIES_LIGHT,
  analogSeriesStyle
} from './analog-series-palette'

describe('analog series palette', () => {
  it('pins the cross-renderer contract with analog-cli verbatim', () => {
    expect(ANALOG_SERIES_LIGHT).toEqual([
      '#2a78d6',
      '#eb6834',
      '#1baf7a',
      '#eda100',
      '#e87ba4',
      '#008300',
      '#4a3aa7',
      '#e34948'
    ])
    expect(ANALOG_SERIES_DARK).toEqual([
      '#3987e5',
      '#d95926',
      '#199e70',
      '#c98500',
      '#d55181',
      '#008300',
      '#9085e9',
      '#e66767'
    ])
    expect(ANALOG_SERIES_DASHES).toEqual([[], [6, 3], [1, 3]])
    expect(ANALOG_MAX_PLOTTED_SERIES).toBe(24)
  })

  it('cycles the dash pattern once the hues run out', () => {
    expect(analogSeriesStyle(0, false)).toEqual({ stroke: '#2a78d6', dash: [] })
    expect(analogSeriesStyle(9, true)).toEqual({ stroke: '#d95926', dash: [6, 3] })
    expect(analogSeriesStyle(17, false)).toEqual({ stroke: '#eb6834', dash: [1, 3] })
  })
})
