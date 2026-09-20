import { defineMethod } from '../core'
import {
  KicadArtifactReadParams,
  KicadAvailabilityParams,
  KicadPcbLayersRenderParams,
  KicadPcbModelExportParams,
  KicadProjectParams,
  KicadSchematicRenderParams,
  KicadWorktreeParams
} from '../../../../shared/rpc-contract/kicad-params'

export const KICAD_METHODS = [
  defineMethod({
    name: 'kicad.availability',
    params: KicadAvailabilityParams,
    handler: async (params, { runtime }) => runtime.kicadAvailability(params)
  }),
  defineMethod({
    name: 'kicad.listProjects',
    params: KicadWorktreeParams,
    handler: async (params, { runtime }) => runtime.kicadListProjects(params)
  }),
  defineMethod({
    name: 'kicad.resolveProject',
    params: KicadProjectParams,
    handler: async (params, { runtime }) => runtime.kicadResolveProject(params)
  }),
  defineMethod({
    name: 'kicad.renderSchematic',
    params: KicadSchematicRenderParams,
    handler: async (params, { runtime }) => runtime.kicadRenderSchematic(params)
  }),
  defineMethod({
    name: 'kicad.renderPcbLayers',
    params: KicadPcbLayersRenderParams,
    handler: async (params, { runtime }) => runtime.kicadRenderPcbLayers(params)
  }),
  defineMethod({
    name: 'kicad.exportPcbModel',
    params: KicadPcbModelExportParams,
    handler: async (params, { runtime }) => runtime.kicadExportPcbModel(params)
  }),
  defineMethod({
    name: 'kicad.readArtifact',
    params: KicadArtifactReadParams,
    handler: async (params, { runtime }) => runtime.kicadReadArtifact(params)
  })
] as const
