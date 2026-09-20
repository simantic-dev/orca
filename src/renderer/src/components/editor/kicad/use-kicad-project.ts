import { useCallback, useEffect, useState } from 'react'
import type { KicadProjectInfo } from '../../../../../shared/kicad-viewer-contract'
import { kicadResolveProject, resolveKicadHost } from '@/runtime/kicad-rpc-client'
import { translate } from '@/i18n/i18n'
import { kicadViewerErrorState, type KicadViewerErrorState } from './kicad-viewer-error-state'

export type KicadProjectState =
  | { status: 'resolving' }
  | { status: 'unavailable'; error: KicadViewerErrorState }
  | { status: 'ready'; info: KicadProjectInfo }

const HOST_RETRY_MS = 500
const HOST_RETRY_LIMIT = 20

/** Resolves the workspace host, then the project on it; `revision` re-resolves after source edits. */
export function useKicadProject(
  worktreeId: string,
  relativePath: string,
  revision: number
): { state: KicadProjectState; retry: () => void } {
  const [state, setState] = useState<KicadProjectState>({ status: 'resolving' })
  const [attempt, setAttempt] = useState(0)
  const [hostAttempt, setHostAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((current) => current + 1), [])
  const host = resolveKicadHost(worktreeId)

  // Why: right after a restore the repo row may not have landed yet; poll briefly, never guess "local".
  useEffect(() => {
    if (host.kind !== 'unresolved' || hostAttempt >= HOST_RETRY_LIMIT) {
      return
    }
    const timer = setTimeout(() => setHostAttempt((current) => current + 1), HOST_RETRY_MS)
    return () => clearTimeout(timer)
  }, [host.kind, hostAttempt])

  useEffect(() => {
    if (host.kind === 'unresolved') {
      setState(
        hostAttempt >= HOST_RETRY_LIMIT
          ? {
              status: 'unavailable',
              error: {
                variant: 'error',
                message: translate(
                  'auto.components.editor.kicad.use.kicad.project.2f7b321787',
                  'The workspace host is not known yet.'
                ),
                detail: null
              }
            }
          : { status: 'resolving' }
      )
      return
    }
    if (host.kind === 'unsupported') {
      setState({
        status: 'unavailable',
        error: { variant: 'remote-unsupported', message: null, detail: null }
      })
      return
    }
    let cancelled = false
    setState({ status: 'resolving' })
    kicadResolveProject(worktreeId, relativePath)
      .then((info) => {
        if (!cancelled) {
          setState({ status: 'ready', info })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'unavailable', error: kicadViewerErrorState(error) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt, host.kind, hostAttempt, relativePath, revision, worktreeId])

  return { state, retry }
}
