import { describe, expect, it } from 'vitest'
import { cameraDirectionForPreset, fitDistanceForBox } from './kicad-three-camera-fit'

describe('kicad three camera fit', () => {
  it('backs the camera off further for larger boards and wider fields of view', () => {
    const small = fitDistanceForBox({ x: 50, y: 30, z: 2 }, 40, 1.5)
    const large = fitDistanceForBox({ x: 200, y: 120, z: 2 }, 40, 1.5)
    const wide = fitDistanceForBox({ x: 50, y: 30, z: 2 }, 80, 1.5)
    expect(large).toBeGreaterThan(small)
    expect(wide).toBeLessThan(small)
    expect(small).toBeGreaterThan(30)
  })

  it('looks straight down for top, up for bottom, and obliquely for iso', () => {
    expect(cameraDirectionForPreset('top').y).toBe(1)
    expect(cameraDirectionForPreset('bottom').y).toBe(-1)
    expect(cameraDirectionForPreset('iso').y).toBeGreaterThan(0)
    expect(cameraDirectionForPreset('iso').x).not.toBe(0)
  })
})
