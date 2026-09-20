import { kicadErrorCode, kicadErrorData } from '@/runtime/kicad-rpc-client'
import type { KicadViewerEmptyStateVariant } from './KicadViewerEmptyState'

export type KicadViewerErrorState = {
  variant: KicadViewerEmptyStateVariant
  message: string | null
  detail: string | null
}

/** Maps a host error onto the empty state the user should see, keeping kicad-cli's own words. */
export function kicadViewerErrorState(error: unknown): KicadViewerErrorState {
  const code = kicadErrorCode(error)
  const data = kicadErrorData(error)
  const message =
    error instanceof Error && !error.message.startsWith('kicad_') ? error.message : null
  const stderrTail = typeof data?.stderrTail === 'string' ? data.stderrTail : null
  if (code === 'kicad_cli_not_found') {
    return { variant: 'cli-not-found', message, detail: null }
  }
  if (code === 'kicad_cli_too_old') {
    return { variant: 'cli-too-old', message, detail: null }
  }
  if (code === 'kicad_remote_host_unsupported') {
    return { variant: 'remote-unsupported', message: null, detail: null }
  }
  if (code === 'kicad_pcb_missing') {
    return { variant: 'no-pcb', message: null, detail: null }
  }
  if (code === 'kicad_export_failed') {
    return { variant: 'export-failed', message, detail: stderrTail }
  }
  if (code === 'kicad_artifact_too_large') {
    return { variant: 'too-large', message, detail: null }
  }
  if (
    code === 'kicad_project_not_found' ||
    code === 'kicad_project_ambiguous' ||
    code === 'kicad_schematic_missing'
  ) {
    return { variant: 'project-error', message, detail: null }
  }
  return { variant: 'error', message: message ?? String(error), detail: null }
}
