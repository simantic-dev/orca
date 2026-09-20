import { useEffect, useState } from 'react'
import type { KicadPcbModelDetail } from '../../../../../shared/kicad-viewer-contract'
import { cacheKicadArtifact, getCachedKicadArtifact } from '@/runtime/kicad-artifact-cache'
import { kicadExportPcbModel, readKicadArtifact } from '@/runtime/kicad-rpc-client'
import { kicadViewerErrorState, type KicadViewerErrorState } from './kicad-viewer-error-state'

export type KicadPcbModelState =
  | { status: 'exporting' }
  | { status: 'downloading'; byteLength: number }
  | { status: 'ready'; bytes: Uint8Array; detail: KicadPcbModelDetail }
  | { status: 'error'; error: KicadViewerErrorState }

/** Exports the board as GLB on the host, then pulls the bytes (chunked, memory-cached). */
export function useKicadPcbModel(
  worktreeId: string,
  relativePath: string,
  detail: KicadPcbModelDetail,
  revision: number,
  forceToken: number,
  retryToken: number
): KicadPcbModelState {
  const [state, setState] = useState<KicadPcbModelState>({ status: 'exporting' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'exporting' })
    const load = async (): Promise<void> => {
      const result = await kicadExportPcbModel(worktreeId, relativePath, {
        detail,
        force: forceToken > 0 && retryToken === 0
      })
      if (controller.signal.aborted) {
        return
      }
      const cached = getCachedKicadArtifact(result.artifact.artifactId)
      if (!cached) {
        setState({ status: 'downloading', byteLength: result.artifact.byteLength })
      }
      const bytes = cached ?? (await readKicadArtifact(result.artifact, controller.signal))
      if (!cached) {
        cacheKicadArtifact(result.artifact.artifactId, bytes)
      }
      if (!controller.signal.aborted) {
        setState({ status: 'ready', bytes, detail: result.detail })
      }
    }
    load().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setState({ status: 'error', error: kicadViewerErrorState(error) })
      }
    })
    return () => controller.abort()
  }, [detail, forceToken, relativePath, retryToken, revision, worktreeId])

  return state
}
