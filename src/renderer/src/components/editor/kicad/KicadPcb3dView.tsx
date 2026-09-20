import { useEffect, useRef, useState } from 'react'
import type { KicadPcbModelDetail } from '../../../../../shared/kicad-viewer-contract'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { KicadViewerEmptyState } from './KicadViewerEmptyState'
import { readCssTokenColor } from './read-css-token-color'
import { useKicadPcbModel } from './use-kicad-pcb-model'
import { useKicadThreeScene } from './use-kicad-three-scene'

type KicadPcb3dViewProps = {
  worktreeId: string
  relativePath: string
  viewStateKey: string
  revision: number
  forceToken: number
}

function formatMegabytes(byteLength: number): string {
  return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`
}

export default function KicadPcb3dView({
  worktreeId,
  relativePath,
  revision,
  forceToken
}: KicadPcb3dViewProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [detail, setDetail] = useState<KicadPcbModelDetail>('full')
  const [retryToken, setRetryToken] = useState(0)
  const theme = useAppStore((state) => state.settings?.theme)
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [backgroundColor, setBackgroundColor] = useState(() => readCssTokenColor('--background'))
  // Why: the token resolves to a different rgb per theme, so re-probe when the theme flips.
  useEffect(() => {
    setBackgroundColor(readCssTokenColor('--background'))
  }, [isDark])
  const model = useKicadPcbModel(worktreeId, relativePath, detail, revision, forceToken, retryToken)
  const bytes = model.status === 'ready' ? model.bytes : null
  const scene = useKicadThreeScene(canvasRef, hostRef, bytes, backgroundColor)

  const overlay = (() => {
    if (model.status === 'exporting') {
      return (
        <KicadViewerEmptyState
          variant="loading"
          message={translate(
            'auto.components.editor.kicad.KicadPcb3dView.aea8569131',
            'Exporting the 3D model — large boards can take a minute.'
          )}
        />
      )
    }
    if (model.status === 'downloading') {
      return (
        <KicadViewerEmptyState
          variant="loading"
          message={translate(
            'auto.components.editor.kicad.KicadPcb3dView.305086a576',
            'Loading {{value0}} model…',
            {
              value0: formatMegabytes(model.byteLength)
            }
          )}
        />
      )
    }
    if (model.status === 'error') {
      return (
        <KicadViewerEmptyState
          variant={model.error.variant}
          message={model.error.message}
          detail={model.error.detail}
          onRetry={() => setRetryToken((current) => current + 1)}
          onLoadBoardOnly={
            model.error.variant === 'too-large' && detail === 'full'
              ? () => setDetail('board-only')
              : undefined
          }
        />
      )
    }
    if (scene.status === 'context-lost') {
      return (
        <KicadViewerEmptyState
          variant="error"
          message={translate(
            'auto.components.editor.kicad.KicadPcb3dView.93698b99fd',
            'The 3D view lost its graphics context.'
          )}
          onRetry={scene.retry}
        />
      )
    }
    if (scene.status === 'error') {
      return (
        <KicadViewerEmptyState variant="error" message={scene.errorMessage} onRetry={scene.retry} />
      )
    }
    if (scene.status === 'parsing') {
      return (
        <KicadViewerEmptyState
          variant="loading"
          message={translate(
            'auto.components.editor.kicad.KicadPcb3dView.a19ed18905',
            'Building the scene…'
          )}
        />
      )
    }
    return null
  })()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
        <Button type="button" size="xs" variant="outline" onClick={() => scene.setPreset('top')}>
          {translate('auto.components.editor.kicad.KicadPcb3dView.512926c0d4', 'Top')}
        </Button>
        <Button type="button" size="xs" variant="outline" onClick={() => scene.setPreset('bottom')}>
          {translate('auto.components.editor.kicad.KicadPcb3dView.90307d6cb4', 'Bottom')}
        </Button>
        <Button type="button" size="xs" variant="outline" onClick={() => scene.setPreset('iso')}>
          {translate('auto.components.editor.kicad.KicadPcb3dView.4511a36600', 'Reset view')}
        </Button>
        {detail === 'board-only' ? (
          <Button type="button" size="xs" variant="ghost" onClick={() => setDetail('full')}>
            {translate('auto.components.editor.kicad.KicadPcb3dView.114ff0dfa0', 'Load full model')}
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {translate(
            'auto.components.editor.kicad.KicadPcb3dView.947731d830',
            'Drag to orbit · scroll to zoom · right-drag to pan'
          )}
        </span>
      </div>
      <div ref={hostRef} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          key={scene.generation}
          ref={canvasRef}
          className="block h-full w-full"
          data-testid="kicad-3d-canvas"
        />
        {overlay ? <div className="absolute inset-0 bg-background">{overlay}</div> : null}
      </div>
    </div>
  )
}
