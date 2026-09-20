import { createHash } from 'node:crypto'
import { mkdir, readdir, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type KicadRenderView = 'sch' | 'pcb'

const LAST_ACCESS_FILE = '.last-access'
const TMP_PREFIX = '.tmp-'
let tmpSequence = 0

export function kicadRenderCacheRoot(userDataPath: string): string {
  return join(userDataPath, 'kicad-render-cache')
}

export function kicadProjectCacheDir(cacheRoot: string, proPath: string): string {
  return join(cacheRoot, createHash('sha256').update(proPath).digest('hex').slice(0, 16))
}

export function kicadStampDir(
  projectCacheDir: string,
  view: KicadRenderView,
  stamp: string
): string {
  return join(projectCacheDir, view, stamp)
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function tmpName(): string {
  tmpSequence += 1
  return `${TMP_PREFIX}${process.pid}-${tmpSequence}`
}

/**
 * Produces a whole stamp directory atomically: the exporter writes into a sibling temp dir that is
 * renamed into place only when it finished, so a half-written render never looks fresh.
 */
export async function produceStampDir(
  stampDir: string,
  produce: (tmpDir: string) => Promise<void>
): Promise<{ cached: boolean }> {
  if (await exists(stampDir)) {
    return { cached: true }
  }
  const parent = join(stampDir, '..')
  await mkdir(parent, { recursive: true })
  const tmpDir = join(parent, tmpName())
  await mkdir(tmpDir, { recursive: true })
  try {
    await produce(tmpDir)
    if (await exists(stampDir)) {
      // A concurrent export won the race; its output is equivalent.
      await rm(tmpDir, { recursive: true, force: true })
      return { cached: true }
    }
    await rename(tmpDir, stampDir)
    return { cached: false }
  } catch (error) {
    await rm(tmpDir, { recursive: true, force: true })
    throw error
  }
}

/** Produces one file inside a stamp directory atomically (write to a temp name, then rename). */
export async function produceStampFile(
  stampDir: string,
  fileName: string,
  produce: (tmpFile: string) => Promise<void>
): Promise<{ path: string; cached: boolean }> {
  const target = join(stampDir, fileName)
  if (await exists(target)) {
    return { path: target, cached: true }
  }
  await mkdir(stampDir, { recursive: true })
  const tmpFile = join(stampDir, `${tmpName()}-${fileName}`)
  try {
    await produce(tmpFile)
    if (await exists(target)) {
      await rm(tmpFile, { force: true })
      return { path: target, cached: true }
    }
    await rename(tmpFile, target)
    return { path: target, cached: false }
  } catch (error) {
    await rm(tmpFile, { force: true })
    throw error
  }
}

/** Only the current source revision is worth keeping; older stamps of the same view go. */
export async function evictSiblingStamps(
  projectCacheDir: string,
  view: KicadRenderView,
  keepStamp: string
): Promise<string[]> {
  const viewDir = join(projectCacheDir, view)
  let entries: string[]
  try {
    entries = await readdir(viewDir)
  } catch {
    return []
  }
  const removed: string[] = []
  for (const entry of entries) {
    if (entry === keepStamp || entry.startsWith(TMP_PREFIX)) {
      continue
    }
    await rm(join(viewDir, entry), { recursive: true, force: true })
    removed.push(join(viewDir, entry))
  }
  return removed
}

export async function touchLastAccess(projectCacheDir: string, now = new Date()): Promise<void> {
  await mkdir(projectCacheDir, { recursive: true })
  const marker = join(projectCacheDir, LAST_ACCESS_FILE)
  await ((await exists(marker)) ? utimes(marker, now, now) : writeFile(marker, ''))
}

async function directoryBytes(dir: string): Promise<number> {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await directoryBytes(path)
    } else if (entry.isFile()) {
      total += (await stat(path)).size
    }
  }
  return total
}

export type KicadRenderCachePruneOptions = {
  now?: number
  maxIdleMs?: number
  maxTotalBytes?: number
}

const DEFAULT_MAX_IDLE_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024

/** Drops projects not opened for a month, then the least recently opened until under the byte cap. */
export async function pruneKicadRenderCache(
  cacheRoot: string,
  options: KicadRenderCachePruneOptions = {}
): Promise<string[]> {
  const now = options.now ?? Date.now()
  const maxIdleMs = options.maxIdleMs ?? DEFAULT_MAX_IDLE_MS
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES
  let entries: string[]
  try {
    entries = await readdir(cacheRoot)
  } catch {
    return []
  }
  const projects: { dir: string; lastAccess: number; bytes: number }[] = []
  for (const entry of entries) {
    const dir = join(cacheRoot, entry)
    if (!(await stat(dir)).isDirectory()) {
      continue
    }
    let lastAccess = 0
    try {
      lastAccess = (await stat(join(dir, LAST_ACCESS_FILE))).mtimeMs
    } catch {
      lastAccess = 0
    }
    projects.push({ dir, lastAccess, bytes: await directoryBytes(dir) })
  }
  const removed: string[] = []
  let total = projects.reduce((sum, project) => sum + project.bytes, 0)
  projects.sort((a, b) => a.lastAccess - b.lastAccess)
  for (const project of projects) {
    const idle = now - project.lastAccess > maxIdleMs
    if (!idle && total <= maxTotalBytes) {
      continue
    }
    await rm(project.dir, { recursive: true, force: true })
    removed.push(project.dir)
    total -= project.bytes
  }
  return removed
}
