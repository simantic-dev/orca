import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'

/**
 * kicad-cli resolves `${KICAD<major>_3DMODEL_DIR}` from the environment only, unlike the KiCad GUI,
 * so an export from an app bundle silently drops every library footprint model. Point it at the
 * bundle's own library when the variable is unset and the directory exists.
 */
export function kicadModelLibraryEnv(
  binaryPath: string,
  major: number,
  env: NodeJS.ProcessEnv,
  exists: (path: string) => boolean = existsSync
): Record<string, string> {
  const key = `KICAD${major}_3DMODEL_DIR`
  if (env[key]) {
    return {}
  }
  const marker = `${sep}Contents${sep}MacOS${sep}`
  const index = binaryPath.indexOf(marker)
  if (index === -1) {
    return {}
  }
  const modelDir = join(binaryPath.slice(0, index), 'Contents', 'SharedSupport', '3dmodels')
  return exists(modelDir) ? { [key]: modelDir } : {}
}
