import { useEffect, useState } from 'react'
import type { KicadArtifactRef } from '../../../../../shared/kicad-viewer-contract'
import { cacheKicadArtifact, getCachedKicadArtifact } from '@/runtime/kicad-artifact-cache'
import { readKicadArtifact } from '@/runtime/kicad-rpc-client'
import { translate } from '@/i18n/i18n'
import { prepareKicadInlineSvg, type KicadInlineSvg } from './kicad-svg-inline'
import { kicadViewerErrorState, type KicadViewerErrorState } from './kicad-viewer-error-state'

export type KicadSvgArtifactState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; svg: KicadInlineSvg }
  | { status: 'error'; error: KicadViewerErrorState }

/** Fetches an SVG artifact (chunked, memory-cached) and prepares it for inline rendering. */
export function useKicadSvgArtifact(artifact: KicadArtifactRef | null): KicadSvgArtifactState {
  const [state, setState] = useState<KicadSvgArtifactState>({ status: 'idle' })
  const artifactId = artifact?.artifactId ?? null

  useEffect(() => {
    if (!artifact) {
      setState({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    setState({ status: 'loading' })
    const load = async (): Promise<void> => {
      const cached = getCachedKicadArtifact(artifact.artifactId)
      const bytes = cached ?? (await readKicadArtifact(artifact, controller.signal))
      if (!cached) {
        cacheKicadArtifact(artifact.artifactId, bytes)
      }
      const svg = prepareKicadInlineSvg(new TextDecoder().decode(bytes))
      if (controller.signal.aborted) {
        return
      }
      if (!svg) {
        setState({
          status: 'error',
          error: {
            variant: 'error',
            message: translate(
              'auto.components.editor.kicad.use.kicad.svg.artifact.c888d75e09',
              'kicad-cli produced an SVG the viewer could not read.'
            ),
            detail: null
          }
        })
        return
      }
      setState({ status: 'ready', svg })
    }
    load().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setState({ status: 'error', error: kicadViewerErrorState(error) })
      }
    })
    return () => controller.abort()
    // Why: the ref object is rebuilt on every render reply; the id is what identifies the bytes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId])

  return state
}
