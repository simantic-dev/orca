import type { KicadErrorCode } from '../../shared/kicad-viewer-contract'

/** Crosses the RPC boundary with its code intact (allow-listed in rpc/errors.ts). */
export class KicadError extends Error {
  readonly code: KicadErrorCode
  readonly data?: unknown

  constructor(code: KicadErrorCode, message: string = code, data?: unknown) {
    super(message)
    this.name = 'KicadError'
    this.code = code
    this.data = data
  }
}
