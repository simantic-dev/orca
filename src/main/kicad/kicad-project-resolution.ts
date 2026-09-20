import { readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { KicadError } from './kicad-errors'

export type KicadProject = {
  name: string
  dir: string
  proPath: string
  schPath: string
  pcbPath: string | null
  /** Every `.kicad_sch` beside the project, root first: hierarchical sheets change the render too. */
  sheetPaths: string[]
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function resolveProjectFile(target: string): Promise<string> {
  let targetStat
  try {
    targetStat = await stat(target)
  } catch {
    throw new KicadError('kicad_project_not_found', `${target} does not exist`)
  }
  if (targetStat.isFile()) {
    if (extname(target) !== '.kicad_pro') {
      throw new KicadError('kicad_project_not_found', `${target} is not a .kicad_pro file`)
    }
    return target
  }
  const candidates = (await readdir(target)).filter((name) => extname(name) === '.kicad_pro').sort()
  if (candidates.length === 0) {
    throw new KicadError('kicad_project_not_found', `no .kicad_pro found in ${target}`)
  }
  if (candidates.length > 1) {
    throw new KicadError('kicad_project_ambiguous', `several .kicad_pro files in ${target}`, {
      candidates
    })
  }
  return join(target, candidates[0])
}

/** Mirrors analog-cli's `frontend::kicad::resolve`: the root sheet and board share the project stem. */
export async function resolveKicadProject(target: string): Promise<KicadProject> {
  const proPath = await resolveProjectFile(target)
  const dir = dirname(proPath)
  const name = basename(proPath, '.kicad_pro')
  const schPath = join(dir, `${name}.kicad_sch`)
  if (!(await exists(schPath))) {
    throw new KicadError('kicad_schematic_missing', `${schPath} is missing`)
  }
  const pcbPath = join(dir, `${name}.kicad_pcb`)
  const sheets = (await readdir(dir))
    .filter((entry) => extname(entry) === '.kicad_sch' && entry !== `${name}.kicad_sch`)
    .sort()
    .map((entry) => join(dir, entry))
  return {
    name,
    dir,
    proPath,
    schPath,
    pcbPath: (await exists(pcbPath)) ? pcbPath : null,
    sheetPaths: [schPath, ...sheets]
  }
}
