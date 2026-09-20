import { describe, expect, it } from 'vitest'
import { parseKicadPcbLayers } from './kicad-pcb-layers'

const MINI_PCB = `(kicad_pcb (version 20240108) (generator "pcbnew")
  (general (thickness 1.6))
  (layers
    (0 "F.Cu" signal)
    (2 "B.Cu" signal)
    (9 "F.Adhes" user "F.Adhesive")
    (44 "Edge.Cuts" user)
  )
  (setup (pad_to_mask_clearance 0))
  (net 0 "")
)`

describe('parseKicadPcbLayers', () => {
  it('reads ordinal, name, kind and the optional user name from the layer table only', () => {
    expect(parseKicadPcbLayers(MINI_PCB)).toEqual([
      { ordinal: 0, name: 'F.Cu', kind: 'signal' },
      { ordinal: 2, name: 'B.Cu', kind: 'signal' },
      { ordinal: 9, name: 'F.Adhes', kind: 'user', userName: 'F.Adhesive' },
      { ordinal: 44, name: 'Edge.Cuts', kind: 'user' }
    ])
  })

  it('returns nothing for text without a layer table', () => {
    expect(parseKicadPcbLayers('(kicad_pcb (net 0 ""))')).toEqual([])
  })
})
