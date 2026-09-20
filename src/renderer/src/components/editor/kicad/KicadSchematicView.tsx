import { useEffect, useMemo, useState } from 'react'
import type { KicadSchematicRenderResult } from '../../../../../shared/kicad-viewer-contract'
import { kicadRenderSchematic } from '@/runtime/kicad-rpc-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { KicadSvgPanSurface } from './KicadSvgPanSurface'
import { KicadViewerEmptyState } from './KicadViewerEmptyState'
import { kicadViewerErrorState, type KicadViewerErrorState } from './kicad-viewer-error-state'
import { getKicadViewerViewState, updateKicadViewerViewState } from './kicad-viewer-view-state'
import { useKicadSvgArtifact } from './use-kicad-svg-artifact'

type KicadSchematicViewProps = {
  worktreeId: string
  relativePath: string
  viewStateKey: string
  revision: number
  forceToken: number
}

const EMPTY_PAGES: KicadSchematicRenderResult['pages'] = []

type RenderState =
  | { status: 'loading' }
  | { status: 'ready'; result: KicadSchematicRenderResult }
  | { status: 'error'; error: KicadViewerErrorState }

export function KicadSchematicView({
  worktreeId,
  relativePath,
  viewStateKey,
  revision,
  forceToken
}: KicadSchematicViewProps): React.JSX.Element {
  const [render, setRender] = useState<RenderState>({ status: 'loading' })
  const [sheetId, setSheetId] = useState<string | null>(
    () => getKicadViewerViewState(viewStateKey).sheetId
  )
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setRender({ status: 'loading' })
    kicadRenderSchematic(worktreeId, relativePath, { force: forceToken > 0 && retryToken === 0 })
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
  }, [forceToken, relativePath, retryToken, revision, worktreeId])

  const pages = render.status === 'ready' ? render.result.pages : EMPTY_PAGES
  const activePage = useMemo(
    () => pages.find((page) => page.id === sheetId) ?? pages[0] ?? null,
    [pages, sheetId]
  )
  const svg = useKicadSvgArtifact(activePage?.artifact ?? null)
  const zoomKey = `schematic:${activePage?.id ?? ''}`
  const zoom = getKicadViewerViewState(viewStateKey).zoomByView[zoomKey] ?? 1

  if (render.status === 'loading') {
    return <KicadViewerEmptyState variant="loading" />
  }
  if (render.status === 'error') {
    return (
      <KicadViewerEmptyState
        variant={render.error.variant}
        message={render.error.message}
        detail={render.error.detail}
        onRetry={() => setRetryToken((current) => current + 1)}
      />
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      {pages.length > 1 ? (
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            {translate('auto.components.editor.kicad.KicadSchematicView.17c70bb16e', 'Sheet')}
          </span>
          <Select
            value={activePage?.id ?? undefined}
            onValueChange={(next) => {
              setSheetId(next)
              updateKicadViewerViewState(viewStateKey, { sheetId: next })
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page.id} value={page.id}>
                  {page.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {svg.status === 'ready' ? (
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
