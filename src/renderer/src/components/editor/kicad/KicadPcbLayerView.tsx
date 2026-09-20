import { useEffect, useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import type { KicadPcbLayersRenderResult } from '../../../../../shared/kicad-viewer-contract'
import { kicadRenderPcbLayers } from '@/runtime/kicad-rpc-client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { translate } from '@/i18n/i18n'
import { KicadSvgPanSurface } from './KicadSvgPanSurface'
import { KicadViewerEmptyState } from './KicadViewerEmptyState'
import { kicadViewerErrorState, type KicadViewerErrorState } from './kicad-viewer-error-state'
import {
  getKicadViewerViewState,
  updateKicadViewerViewState,
  type KicadPcbSide
} from './kicad-viewer-view-state'
import { useKicadSvgArtifact } from './use-kicad-svg-artifact'

const FRONT_PRESET = ['F.Cu', 'F.SilkS', 'F.Mask', 'Edge.Cuts']
const BACK_PRESET = ['B.Cu', 'B.SilkS', 'B.Mask', 'Edge.Cuts']

type KicadPcbLayerViewProps = {
  worktreeId: string
  relativePath: string
  viewStateKey: string
  revision: number
  forceToken: number
}

type RenderState =
  | { status: 'loading' }
  | { status: 'ready'; result: KicadPcbLayersRenderResult }
  | { status: 'error'; error: KicadViewerErrorState }

function presetFor(side: KicadPcbSide): string[] {
  return side === 'front' ? FRONT_PRESET : BACK_PRESET
}

export function KicadPcbLayerView({
  worktreeId,
  relativePath,
  viewStateKey,
  revision,
  forceToken
}: KicadPcbLayerViewProps): React.JSX.Element {
  const initial = getKicadViewerViewState(viewStateKey)
  const [side, setSide] = useState<KicadPcbSide>(initial.side)
  const [layersBySide, setLayersBySide] = useState(initial.layersBySide)
  const [render, setRender] = useState<RenderState>({ status: 'loading' })
  const [retryToken, setRetryToken] = useState(0)
  const layers = layersBySide[side] ?? presetFor(side)
  const layersKey = layers.join(',')

  useEffect(() => {
    let cancelled = false
    setRender({ status: 'loading' })
    kicadRenderPcbLayers(worktreeId, relativePath, {
      layers: layersKey.split(','),
      mirror: side === 'back',
      force: forceToken > 0 && retryToken === 0
    })
      .then((result) => {
        if (!cancelled) {
          setRender({ status: 'ready', result })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRender({ status: 'error', error: kicadViewerErrorState(error) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [forceToken, layersKey, relativePath, retryToken, revision, side, worktreeId])

  const artifact = render.status === 'ready' ? render.result.artifact : null
  const svg = useKicadSvgArtifact(artifact)
  const availableLayers = render.status === 'ready' ? render.result.layers : []
  const zoomKey = `pcb:${side}`
  const zoom = getKicadViewerViewState(viewStateKey).zoomByView[zoomKey] ?? 1
  const selected = useMemo(() => new Set(layers), [layers])

  const setLayers = (next: string[]): void => {
    const nextBySide = { ...layersBySide, [side]: next }
    setLayersBySide(nextBySide)
    updateKicadViewerViewState(viewStateKey, { layersBySide: nextBySide })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <ToggleGroup
          type="single"
          size="sm"
          value={side}
          onValueChange={(next) => {
            if (next === 'front' || next === 'back') {
              setSide(next)
              updateKicadViewerViewState(viewStateKey, { side: next })
            }
          }}
        >
          <ToggleGroupItem value="front">
            {translate('auto.components.editor.kicad.KicadPcbLayerView.8ead480379', 'Front')}
          </ToggleGroupItem>
          <ToggleGroupItem value="back">
            {translate('auto.components.editor.kicad.KicadPcbLayerView.44944405c3', 'Back')}
          </ToggleGroupItem>
        </ToggleGroup>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={availableLayers.length === 0}
            >
              <Layers />
              {translate('auto.components.editor.kicad.KicadPcbLayerView.0f8deb3c07', 'Layers')}
              <span className="text-muted-foreground">({layers.length})</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {translate(
                  'auto.components.editor.kicad.KicadPcbLayerView.9c434432c0',
                  'Layers to draw'
                )}
              </span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setLayers(presetFor(side))}
              >
                {translate('auto.components.editor.kicad.KicadPcbLayerView.d46e93b433', 'Preset')}
              </Button>
            </div>
            <div className="scrollbar-sleek max-h-72 space-y-1 overflow-auto">
              {availableLayers.map((layer) => {
                const checked = selected.has(layer.name)
                return (
                  <label
                    key={layer.name}
                    className="flex cursor-pointer items-center gap-2 text-xs"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const next =
                          value === true
                            ? [...layers, layer.name]
                            : layers.filter((name) => name !== layer.name)
                        if (next.length > 0) {
                          setLayers(next)
                        }
                      }}
                    />
                    <span className="truncate">{layer.userName ?? layer.name}</span>
                    {layer.userName ? (
                      <span className="ml-auto text-muted-foreground">{layer.name}</span>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="min-h-0 flex-1">
        {render.status === 'loading' ? (
          <KicadViewerEmptyState variant="loading" />
        ) : render.status === 'error' ? (
          <KicadViewerEmptyState
            variant={render.error.variant}
            message={render.error.message}
            detail={render.error.detail}
            onRetry={() => setRetryToken((current) => current + 1)}
          />
        ) : svg.status === 'ready' ? (
          <KicadSvgPanSurface
            svg={svg.svg}
            zoom={zoom}
            onZoomChange={(next) => {
              const current = getKicadViewerViewState(viewStateKey)
              updateKicadViewerViewState(viewStateKey, {
                zoomByView: { ...current.zoomByView, [zoomKey]: next }
              })
            }}
          />
        ) : svg.status === 'error' ? (
          <KicadViewerEmptyState
            variant={svg.error.variant}
            message={svg.error.message}
            detail={svg.error.detail}
            onRetry={() => setRetryToken((current) => current + 1)}
          />
        ) : (
          <KicadViewerEmptyState variant="loading" />
        )}
      </div>
    </div>
  )
}
