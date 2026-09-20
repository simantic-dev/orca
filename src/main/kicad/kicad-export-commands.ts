import { KicadError } from './kicad-errors'
import { KICAD_LAYER_NAME_RE, type KicadPcbModelDetail } from '../../shared/kicad-viewer-contract'

export const KICAD_FRONT_LAYERS = ['F.Cu', 'F.SilkS', 'F.Mask', 'Edge.Cuts'] as const
export const KICAD_BACK_LAYERS = ['B.Cu', 'B.SilkS', 'B.Mask', 'Edge.Cuts'] as const

// The exact commands analog-gui runs (analog-cli src/frontend/kicad_cli.rs), so both frontends agree.
export function schematicSvgExportArgs(schPath: string, outDir: string): string[] {
  return [
    'sch',
    'export',
    'svg',
    '--exclude-drawing-sheet',
    '--no-background-color',
    '-o',
    outDir,
    schPath
  ]
}

export function validateKicadLayerNames(layers: readonly string[]): string[] {
  const names = layers.map((layer) => layer.trim())
  for (const name of names) {
    if (!KICAD_LAYER_NAME_RE.test(name)) {
      throw new KicadError('kicad_export_failed', `invalid layer name: ${name}`)
    }
  }
  return names
}

/** `--page-size-mode 2` crops to the board, so the SVG box is the copper, not a sheet. */
export function pcbLayersSvgExportArgs(
  pcbPath: string,
  outFile: string,
  layers: readonly string[],
  mirror: boolean
): string[] {
  const args = [
    'pcb',
    'export',
    'svg',
    '--mode-single',
    '--page-size-mode',
    '2',
    '--exclude-drawing-sheet',
    '-l',
    validateKicadLayerNames(layers).join(',')
  ]
  if (mirror) {
    args.push('--mirror')
  }
  return [...args, '-o', outFile, pcbPath]
}

export function pcbGlbExportArgs(
  pcbPath: string,
  outFile: string,
  detail: KicadPcbModelDetail
): string[] {
  const args = [
    'pcb',
    'export',
    'glb',
    '--subst-models',
    '--include-tracks',
    '--include-pads',
    '--include-zones'
  ]
  if (detail === 'board-only') {
    args.push('--board-only')
  } else {
    args.push('--include-silkscreen', '--include-soldermask', '--no-dnp')
  }
  return [...args, '--force', '-o', outFile, pcbPath]
}

/** Raytraced fallback for hosts without WebGL; not wired in v1. */
export function pcbRenderPngArgs(
  pcbPath: string,
  outFile: string,
  side: 'top' | 'bottom',
  width: number,
  height: number
): string[] {
  return [
    'pcb',
    'render',
    '--side',
    side,
    '--quality',
    'basic',
    '--width',
    String(width),
    '--height',
    String(height),
    '-o',
    outFile,
    pcbPath
  ]
}

export function layersCacheKey(layers: readonly string[], mirror: boolean): string {
  const key = validateKicadLayerNames(layers)
    .map((layer) => layer.replaceAll('.', '_'))
    .join('+')
  return `${key}-${mirror ? 'back' : 'front'}`
}
