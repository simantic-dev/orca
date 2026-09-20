// Shared result shapes and error codes for the KiCad project viewer (`kicad.*` RPC).

export type KicadCliSource = 'settings' | 'env' | 'path' | 'app-bundle'

export type KicadCliAvailability =
  | {
      status: 'found'
      binaryPath: string
      version: string
      major: number
      source: KicadCliSource
    }
  | {
      status: 'too-old'
      binaryPath: string
      version: string
      major: number
      source: KicadCliSource
      message: string
    }
  | { status: 'not-found'; tried: string[]; message: string }

/** `pcb export glb` and `pcb render` arrived in KiCad 8; nothing older can serve the viewer. */
export const KICAD_CLI_MIN_MAJOR = 8
export const KICAD_CLI_ENV = 'SIMANTIC_KICAD_CLI'

/** Layer names as KiCad spells them (`F.Cu`, `In1.Cu`); anything else never reaches a command line. */

export const KICAD_LAYER_NAME_RE = /^[A-Za-z0-9_.]+$/

export const KICAD_ERROR_CODES = [
  'kicad_cli_not_found',
  'kicad_cli_too_old',
  'kicad_project_not_found',
  'kicad_project_ambiguous',
  'kicad_schematic_missing',
  'kicad_pcb_missing',
  'kicad_export_failed',
  'kicad_artifact_too_large',
  'kicad_artifact_not_found',
  'kicad_remote_host_unsupported'
] as const

export type KicadErrorCode = (typeof KICAD_ERROR_CODES)[number]

export const KICAD_SVG_MAX_BYTES = 16 * 1024 * 1024
export const KICAD_GLB_MAX_BYTES = 64 * 1024 * 1024
export const KICAD_ARTIFACT_CHUNK_MAX_BYTES = 1024 * 1024

export type KicadArtifactMime = 'image/svg+xml' | 'model/gltf-binary' | 'image/png'

export type KicadArtifactRef = { artifactId: string; byteLength: number; mime: KicadArtifactMime }

export type KicadPcbLayerInfo = { ordinal: number; name: string; kind: string; userName?: string }

export type KicadProjectInfo = {
  name: string
  proRelativePath: string
  dirRelativePath: string
  hasPcb: boolean
  sheetCount: number
}

export type KicadProjectListing = { name: string; proRelativePath: string; dirRelativePath: string }

export type KicadSchematicPage = { id: string; label: string; artifact: KicadArtifactRef }

export type KicadSchematicRenderResult = {
  stamp: string
  cached: boolean
  pages: KicadSchematicPage[]
}

export type KicadPcbLayersRenderResult = {
  stamp: string
  cached: boolean
  layers: KicadPcbLayerInfo[]
  artifact: KicadArtifactRef
}

export type KicadPcbModelDetail = 'full' | 'board-only'

export type KicadPcbModelExportResult = {
  stamp: string
  cached: boolean
  detail: KicadPcbModelDetail
  artifact: KicadArtifactRef
}

export type KicadArtifactChunk = { contentBase64: string; bytesRead: number; eof: boolean }
