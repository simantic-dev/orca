import type {
  KicadArtifactChunk,
  KicadArtifactRef,
  KicadCliAvailability,
  KicadPcbLayersRenderResult,
  KicadPcbModelDetail,
  KicadPcbModelExportResult,
  KicadProjectInfo,
  KicadProjectListing,
  KicadSchematicRenderResult
} from '../../../shared/kicad-viewer-contract'
import { KICAD_ARTIFACT_CHUNK_MAX_BYTES } from '../../../shared/kicad-viewer-contract'
import { resolveLocalHardwareHost, type LocalHardwareHostResolution } from './local-hardware-host'
import { callRuntimeRpc } from './runtime-rpc-client'
import { toRuntimeWorktreeSelector } from './runtime-worktree-selector'

export type KicadHostResolution = LocalHardwareHostResolution

export const resolveKicadHost = resolveLocalHardwareHost

const LOCAL = { kind: 'local' } as const
const RESOLVE_TIMEOUT_MS = 15_000
const SVG_TIMEOUT_MS = 180_000
const GLB_TIMEOUT_MS = 330_000

function projectParams(worktreeId: string, relativePath: string) {
  return { worktree: toRuntimeWorktreeSelector(worktreeId), relativePath }
}

export function kicadAvailability(): Promise<KicadCliAvailability> {
  return callRuntimeRpc<KicadCliAvailability>(
    LOCAL,
    'kicad.availability',
    {},
    {
      timeoutMs: RESOLVE_TIMEOUT_MS
    }
  )
}

export function kicadListProjects(
  worktreeId: string
): Promise<{ projects: KicadProjectListing[] }> {
  return callRuntimeRpc<{ projects: KicadProjectListing[] }>(
    LOCAL,
    'kicad.listProjects',
    { worktree: toRuntimeWorktreeSelector(worktreeId) },
    { timeoutMs: RESOLVE_TIMEOUT_MS }
  )
}

export function kicadResolveProject(
  worktreeId: string,
  relativePath: string
): Promise<KicadProjectInfo> {
  return callRuntimeRpc<KicadProjectInfo>(
    LOCAL,
    'kicad.resolveProject',
    projectParams(worktreeId, relativePath),
    {
      timeoutMs: RESOLVE_TIMEOUT_MS
    }
  )
}

export function kicadRenderSchematic(
  worktreeId: string,
  relativePath: string,
  options: { force?: boolean } = {}
): Promise<KicadSchematicRenderResult> {
  return callRuntimeRpc<KicadSchematicRenderResult>(
    LOCAL,
    'kicad.renderSchematic',
    { ...projectParams(worktreeId, relativePath), ...options },
    { timeoutMs: SVG_TIMEOUT_MS }
  )
}

export function kicadRenderPcbLayers(
  worktreeId: string,
  relativePath: string,
  options: { layers: readonly string[]; mirror: boolean; force?: boolean }
): Promise<KicadPcbLayersRenderResult> {
  return callRuntimeRpc<KicadPcbLayersRenderResult>(
    LOCAL,
    'kicad.renderPcbLayers',
    {
      ...projectParams(worktreeId, relativePath),
      layers: [...options.layers],
      mirror: options.mirror,
      force: options.force
    },
    { timeoutMs: SVG_TIMEOUT_MS }
  )
}

export function kicadExportPcbModel(
  worktreeId: string,
  relativePath: string,
  options: { detail: KicadPcbModelDetail; force?: boolean }
): Promise<KicadPcbModelExportResult> {
  return callRuntimeRpc<KicadPcbModelExportResult>(
    LOCAL,
    'kicad.exportPcbModel',
    { ...projectParams(worktreeId, relativePath), ...options },
    { timeoutMs: GLB_TIMEOUT_MS }
  )
}

function base64ToBytes(contentBase64: string): Uint8Array {
  const binary = atob(contentBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/** Pulls an artifact in bounded chunks so a multi-megabyte board never travels as one IPC message. */
export async function readKicadArtifact(
  artifact: KicadArtifactRef,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const bytes = new Uint8Array(artifact.byteLength)
  let offset = 0
  while (offset < artifact.byteLength) {
    if (signal?.aborted) {
      throw new DOMException('artifact read aborted', 'AbortError')
    }
    const length = Math.min(KICAD_ARTIFACT_CHUNK_MAX_BYTES, artifact.byteLength - offset)
    const chunk = await callRuntimeRpc<KicadArtifactChunk>(
      LOCAL,
      'kicad.readArtifact',
      { artifactId: artifact.artifactId, offset, length },
      { timeoutMs: RESOLVE_TIMEOUT_MS }
    )
    if (chunk.bytesRead === 0) {
      break
    }
    bytes.set(base64ToBytes(chunk.contentBase64), offset)
    offset += chunk.bytesRead
    if (chunk.eof) {
      break
    }
  }
  return offset === artifact.byteLength ? bytes : bytes.subarray(0, offset)
}

/** The host answers with a stable code as the message (or a structured code); anything else is prose. */
export function kicadErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }
  if ('code' in error && typeof error.code === 'string' && error.code.startsWith('kicad_')) {
    return error.code
  }
  if (
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.startsWith('kicad_')
  ) {
    return error.message
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Structured details travel as `data` on the error, or inside the RPC failure envelope the client kept. */
export function kicadErrorData(error: unknown): Record<string, unknown> | null {
  if (!isRecord(error)) {
    return null
  }
  if (isRecord(error.data)) {
    return error.data
  }
  if (
    isRecord(error.response) &&
    isRecord(error.response.error) &&
    isRecord(error.response.error.data)
  ) {
    return error.response.error.data
  }
  return null
}
