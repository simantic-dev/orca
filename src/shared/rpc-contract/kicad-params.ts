import { z } from 'zod'
import { KICAD_ARTIFACT_CHUNK_MAX_BYTES, KICAD_LAYER_NAME_RE } from '../kicad-viewer-contract'

export const KicadAvailabilityParams = z.object({
  worktree: z.string().optional(),
  /** Bypass the cached probe (the settings pane's refresh button). */
  refresh: z.boolean().optional()
})

export const KicadWorktreeParams = z.object({ worktree: z.string().min(1) })

/** `relativePath` names the `.kicad_pro` (or its directory) inside the workspace. */
export const KicadProjectParams = KicadWorktreeParams.extend({ relativePath: z.string().min(1) })

export const KicadSchematicRenderParams = KicadProjectParams.extend({
  force: z.boolean().optional()
})

export const KicadPcbLayersRenderParams = KicadProjectParams.extend({
  layers: z.array(z.string().regex(KICAD_LAYER_NAME_RE)).min(1).max(64),
  mirror: z.boolean().optional(),
  force: z.boolean().optional()
})

export const KicadPcbModelExportParams = KicadProjectParams.extend({
  detail: z.enum(['full', 'board-only']).optional(),
  force: z.boolean().optional()
})

export const KicadArtifactReadParams = z.object({
  artifactId: z.string().regex(/^[0-9a-f]{32}$/),
  offset: z.number().int().min(0),
  length: z.number().int().positive().max(KICAD_ARTIFACT_CHUNK_MAX_BYTES)
})
