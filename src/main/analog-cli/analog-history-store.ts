import { readdir, readFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import type { AnalogRunManifest, AnalogRunsListing } from '../../shared/analog-cli-types'
import {
  analogRunManifestSchema,
  toAnalogRunManifest,
  toAnalogRunSummary
} from './analog-run-manifest-schema'

export const ANALOG_RUN_ID_RE = /^\d{8}-\d{6}-\d{3}-\d+$/
const MANIFEST_FILE = 'run.json'

function isInside(root: string, candidate: string): boolean {
  const resolvedRoot = resolve(root)
  const resolvedCandidate = resolve(candidate)
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + sep)
}

async function readManifest(dir: string) {
  const text = await readFile(join(dir, MANIFEST_FILE), 'utf8')
  return analogRunManifestSchema.parse(JSON.parse(text))
}

/**
 * Reads `run.json` manifests newest-first straight from the store, so listing needs no analog-cli
 * binary; `scopePath` mirrors `history list -p`: runs about a target under it, or run from it.
 */
export async function listAnalogRuns(
  historyRoot: string,
  options: { limit: number; scopePath?: string | null }
): Promise<AnalogRunsListing> {
  let ids: string[]
  try {
    ids = (await readdir(historyRoot)).filter((entry) => ANALOG_RUN_ID_RE.test(entry))
  } catch {
    return { historyRoot, runs: [], corrupt: [] }
  }
  ids.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  const listing: AnalogRunsListing = { historyRoot, runs: [], corrupt: [] }
  for (const id of ids) {
    if (listing.runs.length >= options.limit) {
      break
    }
    const dir = join(historyRoot, id)
    let manifest
    try {
      manifest = await readManifest(dir)
    } catch {
      listing.corrupt.push(id)
      continue
    }
    if (options.scopePath) {
      const inScope =
        (manifest.target ? isInside(options.scopePath, manifest.target) : false) ||
        isInside(options.scopePath, manifest.cwd)
      if (!inScope) {
        continue
      }
    }
    listing.runs.push(toAnalogRunSummary(manifest, dir))
  }
  return listing
}

export async function readAnalogRun(historyRoot: string, id: string): Promise<AnalogRunManifest> {
  if (!ANALOG_RUN_ID_RE.test(id)) {
    throw new Error('analog_run_not_found')
  }
  const dir = join(historyRoot, id)
  let manifest
  try {
    manifest = await readManifest(dir)
  } catch {
    throw new Error('analog_run_not_found')
  }
  return toAnalogRunManifest(manifest, dir, join)
}
