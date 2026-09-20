import { afterEach, describe, expect, it } from 'vitest'
import {
  clearKicadViewerViewStateForTests,
  getKicadViewerViewState,
  updateKicadViewerViewState
} from './kicad-viewer-view-state'

afterEach(() => clearKicadViewerViewStateForTests())

describe('kicad viewer view state', () => {
  it('remembers view, sheet, side, layers and zoom per key across remounts', () => {
    expect(getKicadViewerViewState('a').view).toBe('schematic')
    updateKicadViewerViewState('a', { view: 'pcb', side: 'back', zoomByView: { 'pcb:back': 2 } })
    expect(getKicadViewerViewState('a')).toMatchObject({
      view: 'pcb',
      side: 'back',
      zoomByView: { 'pcb:back': 2 }
    })
    expect(getKicadViewerViewState('b').view).toBe('schematic')
  })
})
