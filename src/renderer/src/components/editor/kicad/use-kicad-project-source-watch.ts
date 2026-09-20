import { useEffect, useState } from 'react'
import type { FsChangedPayload } from '../../../../../shared/filesystem-entry-types'

const DEBOUNCE_MS = 500
const SOURCE_EXTENSIONS = ['.kicad_sch', '.kicad_pcb']

export function kicadProjectDirectory(projectFilePath: string): string {
  const cut = Math.max(projectFilePath.lastIndexOf('/'), projectFilePath.lastIndexOf('\\'))
  return cut === -1 ? projectFilePath : projectFilePath.slice(0, cut)
}

/** True when a batch of filesystem events touches a schematic or board under the project directory. */
export function payloadTouchesKicadSources(payload: FsChangedPayload, projectDir: string): boolean {
  const normalizedDir = projectDir.replaceAll('\\', '/').replace(/\/+$/, '')
  return payload.events.some((event) => {
    if (event.kind === 'overflow') {
      return true
    }
    const path = event.absolutePath.replaceAll('\\', '/')
    return (
      path.startsWith(`${normalizedDir}/`) &&
      SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension))
    )
  })
}

/**
 * Bumps a revision when the schematic or board changes on disk. The worktree watcher is already
 * running for any open editor file, so this only listens to its events.
 */
export function useKicadProjectSourceRevision(projectFilePath: string): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const projectDir = kicadProjectDirectory(projectFilePath)
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = window.api.fs.onFsChanged((payload) => {
      if (!payloadTouchesKicadSources(payload, projectDir)) {
        return
      }
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = null
        setRevision((current) => current + 1)
      }, DEBOUNCE_MS)
    })
    return () => {
      unsubscribe()
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [projectFilePath])
  return revision
}
