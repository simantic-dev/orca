import { describe, expect, it } from 'vitest'
import { kicadViewerErrorState } from './kicad-viewer-error-state'

class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly data?: unknown
  ) {
    super(message)
  }
}

describe('kicadViewerErrorState', () => {
  it('maps host codes to viewer states and keeps kicad-cli stderr for export failures', () => {
    expect(kicadViewerErrorState(new Error('kicad_cli_not_found')).variant).toBe('cli-not-found')
    expect(kicadViewerErrorState(new Error('kicad_remote_host_unsupported')).variant).toBe(
      'remote-unsupported'
    )
    expect(kicadViewerErrorState(new Error('kicad_pcb_missing')).variant).toBe('no-pcb')
    expect(
      kicadViewerErrorState(
        new RpcError('kicad-cli exited with code 3', 'kicad_export_failed', {
          stderrTail: 'bad layer'
        })
      )
    ).toEqual({
      variant: 'export-failed',
      message: 'kicad-cli exited with code 3',
      detail: 'bad layer'
    })
    expect(
      kicadViewerErrorState(new RpcError('model is 70 MB', 'kicad_artifact_too_large')).variant
    ).toBe('too-large')
    expect(kicadViewerErrorState(new Error('boom'))).toEqual({
      variant: 'error',
      message: 'boom',
      detail: null
    })
  })
})
