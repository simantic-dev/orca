export type KicadBoxSize = { x: number; y: number; z: number }

/** Distance along the view direction at which a box of this size fills the frustum with a margin. */
export function fitDistanceForBox(
  size: KicadBoxSize,
  fovDegrees: number,
  aspect: number,
  margin = 1.2
): number {
  const halfFov = (fovDegrees * Math.PI) / 360
  const fitHeight = Math.max(size.y, size.z) / 2 / Math.tan(halfFov)
  const horizontalHalfFov = Math.atan(Math.tan(halfFov) * aspect)
  const fitWidth = Math.max(size.x, size.z) / 2 / Math.tan(horizontalHalfFov)
  const depth = Math.max(size.x, size.y, size.z) / 2
  return (Math.max(fitHeight, fitWidth) + depth) * margin
}

export type KicadCameraPreset = 'top' | 'bottom' | 'iso'

/** Unit direction from the target toward the camera; glTF (and KiCad's export) is Y-up, the board lies in XZ. */
export function cameraDirectionForPreset(preset: KicadCameraPreset): {
  x: number
  y: number
  z: number
} {
  switch (preset) {
    case 'top':
      return { x: 0, y: 1, z: 0.0001 }
    case 'bottom':
      return { x: 0, y: -1, z: 0.0001 }
    case 'iso':
      return { x: 0.6, y: 0.75, z: 0.6 }
  }
}
