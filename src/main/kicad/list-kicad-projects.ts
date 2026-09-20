import { readdir } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'node:path'

export type KicadProjectListing = {
  name: string
  proRelativePath: string
  dirRelativePath: string
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/')
}

/** Same walk and ignore set as the markdown document lister, so both pickers see the same tree. */
export async function listKicadProjects(rootPath: string): Promise<KicadProjectListing[]> {
  const projects: KicadProjectListing[] = []

  async function visit(dirPath: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue
      }
      const entryPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'target') {
          continue
        }
        if (entry.name.startsWith('.') && entry.name !== '.github') {
          continue
        }
        await visit(entryPath)
        continue
      }
      if (entry.isFile() && extname(entry.name) === '.kicad_pro') {
        projects.push({
          name: basename(entry.name, '.kicad_pro'),
          proRelativePath: toPosix(relative(rootPath, entryPath)),
          dirRelativePath: toPosix(relative(rootPath, dirname(entryPath)))
        })
      }
    }
  }

  await visit(rootPath)
  return projects.sort((a, b) => a.proRelativePath.localeCompare(b.proRelativePath))
}
