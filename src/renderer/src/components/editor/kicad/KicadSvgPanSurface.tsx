import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import {
  type ApplyImageViewerZoomChange,
  applyAnchoredImageViewerZoomChange,
  applyImageSurfaceWheel,
  getElementSurfaceSize,
  getImageLayoutStyle
} from '../image-viewer-dom-zoom'
import {
  IMAGE_VIEWER_ZOOM_STEP,
  MAX_IMAGE_VIEWER_ZOOM,
  MIN_IMAGE_VIEWER_ZOOM,
  type ImageViewerSurfaceSize,
  getZoomedImageLayoutSize
} from '../image-viewer-zoom'
import { panScrollFromDrag, type PanDragStart } from './kicad-pan-surface-drag'
import type { KicadInlineSvg } from './kicad-svg-inline'

type KicadSvgPanSurfaceProps = {
  svg: KicadInlineSvg
  zoom: number
  onZoomChange: (zoom: number) => void
}

/** Zoom resizes the SVG's layout box (vector re-layout), so strokes stay crisp at any level. */
export function KicadSvgPanSurface({
  svg,
  zoom,
  onZoomChange
}: KicadSvgPanSurfaceProps): React.JSX.Element {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<PanDragStart | null>(null)
  const [surfaceSize, setSurfaceSize] = useState<ImageViewerSurfaceSize | null>(null)
  const [localZoom, setLocalZoom] = useState(zoom)
  const zoomRef = useRef(zoom)

  useEffect(() => {
    if (zoomRef.current !== zoom) {
      zoomRef.current = zoom
      setLocalZoom(zoom)
    }
  }, [zoom])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) {
      return
    }
    const measure = (): void => setSurfaceSize(getElementSurfaceSize(surface))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(surface)
    return () => observer.disconnect()
  }, [])

  const applyZoomChange = useCallback<ApplyImageViewerZoomChange>((getNextZoom, anchor) => {
    applyAnchoredImageViewerZoomChange(surfaceRef.current, setLocalZoom, getNextZoom, anchor)
  }, [])

  // Why: the anchored zoom helper drives React state; the parent learns the result afterwards.
  useEffect(() => {
    if (zoomRef.current !== localZoom) {
      zoomRef.current = localZoom
      onZoomChange(localZoom)
    }
  }, [localZoom, onZoomChange])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) {
      return
    }
    const onWheel = (event: WheelEvent): void => applyImageSurfaceWheel(event, applyZoomChange)
    surface.addEventListener('wheel', onWheel, { passive: false })
    return () => surface.removeEventListener('wheel', onWheel)
  }, [applyZoomChange])

  const layoutStyle = useMemo(
    () =>
      getImageLayoutStyle(
        getZoomedImageLayoutSize({
          imageDimensions: { width: svg.width, height: svg.height },
          surfaceSize,
          zoom: localZoom
        })
      ),
    [localZoom, surfaceSize, svg.height, svg.width]
  )

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return
    }
    const surface = surfaceRef.current
    if (!surface) {
      return
    }
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: surface.scrollLeft,
      scrollTop: surface.scrollTop
    }
    surface.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const start = dragRef.current
    const surface = surfaceRef.current
    if (!start || !surface || start.pointerId !== event.pointerId) {
      return
    }
    const next = panScrollFromDrag(start, event.clientX, event.clientY)
    surface.scrollLeft = next.scrollLeft
    surface.scrollTop = next.scrollTop
  }
  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      surfaceRef.current?.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <div
        ref={surfaceRef}
        className="scrollbar-sleek h-full w-full cursor-grab overflow-auto bg-kicad-paper active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-testid="kicad-svg-surface"
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-4">
          <div
            className="shrink-0 select-none"
            style={layoutStyle}
            dangerouslySetInnerHTML={{ __html: svg.markup }}
          />
        </div>
      </div>
      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={translate(
            'auto.components.editor.kicad.KicadSvgPanSurface.852f1cea3e',
            'Zoom out'
          )}
          disabled={localZoom <= MIN_IMAGE_VIEWER_ZOOM}
          onClick={() => applyZoomChange((current) => current / IMAGE_VIEWER_ZOOM_STEP)}
        >
          <ZoomOut />
        </Button>
        <span className="min-w-10 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(localZoom * 100)}%
        </span>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={translate(
            'auto.components.editor.kicad.KicadSvgPanSurface.96ff881a05',
            'Zoom in'
          )}
          disabled={localZoom >= MAX_IMAGE_VIEWER_ZOOM}
          onClick={() => applyZoomChange((current) => current * IMAGE_VIEWER_ZOOM_STEP)}
        >
          <ZoomIn />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={translate(
            'auto.components.editor.kicad.KicadSvgPanSurface.7e512dbb22',
            'Fit to view'
          )}
          onClick={() => applyZoomChange(() => 1)}
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  )
}
