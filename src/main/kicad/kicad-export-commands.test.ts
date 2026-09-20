import { describe, expect, it } from 'vitest'
import {
  KICAD_BACK_LAYERS,
  KICAD_FRONT_LAYERS,
  layersCacheKey,
  pcbGlbExportArgs,
  pcbLayersSvgExportArgs,
  pcbRenderPngArgs,
  schematicSvgExportArgs
} from './kicad-export-commands'

describe('kicad export argv', () => {
  it('spells the exports exactly as analog-gui does', () => {
    expect(schematicSvgExportArgs('/p/a.kicad_sch', '/out')).toEqual([
      'sch',
      'export',
      'svg',
      '--exclude-drawing-sheet',
      '--no-background-color',
      '-o',
      '/out',
      '/p/a.kicad_sch'
    ])
    expect(
      pcbLayersSvgExportArgs('/p/a.kicad_pcb', '/out/f.svg', KICAD_FRONT_LAYERS, false)
    ).toEqual([
      'pcb',
      'export',
      'svg',
      '--mode-single',
      '--page-size-mode',
      '2',
      '--exclude-drawing-sheet',
      '-l',
      'F.Cu,F.SilkS,F.Mask,Edge.Cuts',
      '-o',
      '/out/f.svg',
      '/p/a.kicad_pcb'
    ])
    expect(
      pcbLayersSvgExportArgs('/p/a.kicad_pcb', '/out/b.svg', KICAD_BACK_LAYERS, true)
    ).toContain('--mirror')
    expect(pcbGlbExportArgs('/p/a.kicad_pcb', '/out/b.glb', 'full')).toEqual([
      'pcb',
      'export',
      'glb',
      '--subst-models',
      '--include-tracks',
      '--include-pads',
      '--include-zones',
      '--include-silkscreen',
      '--include-soldermask',
      '--no-dnp',
      '--force',
      '-o',
      '/out/b.glb',
      '/p/a.kicad_pcb'
    ])
    expect(pcbGlbExportArgs('/p/a.kicad_pcb', '/out/b.glb', 'board-only')).toContain('--board-only')
    expect(pcbRenderPngArgs('/p/a.kicad_pcb', '/out/t.png', 'top', 3840, 2160)).toEqual([
      'pcb',
      'render',
      '--side',
      'top',
      '--quality',
      'basic',
      '--width',
      '3840',
      '--height',
      '2160',
      '-o',
      '/out/t.png',
      '/p/a.kicad_pcb'
    ])
  })

  it('refuses layer names that could smuggle arguments or paths', () => {
    expect(() => pcbLayersSvgExportArgs('/p', '/o', ['F.Cu;rm -rf /'], false)).toThrow(
      expect.objectContaining({ code: 'kicad_export_failed' })
    )
    expect(() => layersCacheKey(['../escape'], false)).toThrow()
  })

  it('derives a filesystem-safe cache key from the layer list and side', () => {
    expect(layersCacheKey(KICAD_FRONT_LAYERS, false)).toBe('F_Cu+F_SilkS+F_Mask+Edge_Cuts-front')
    expect(layersCacheKey(['B.Cu'], true)).toBe('B_Cu-back')
  })
})
