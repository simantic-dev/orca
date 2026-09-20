const MAX_ENTRIES = 3
const MAX_BYTES = 96 * 1024 * 1024

type Entry = { bytes: Uint8Array; at: number }

const entries = new Map<string, Entry>()

function totalBytes(): number {
  let total = 0
  for (const entry of entries.values()) {
    total += entry.bytes.byteLength
  }
  return total
}

/** Switching back to a tab re-parses from memory instead of re-fetching a multi-megabyte model. */
export function getCachedKicadArtifact(artifactId: string): Uint8Array | null {
  const entry = entries.get(artifactId)
  if (!entry) {
    return null
  }
  entry.at = Date.now()
  return entry.bytes
}

export function cacheKicadArtifact(artifactId: string, bytes: Uint8Array): void {
  entries.set(artifactId, { bytes, at: Date.now() })
  while (entries.size > MAX_ENTRIES || totalBytes() > MAX_BYTES) {
    let oldestId: string | null = null
    let oldestAt = Number.POSITIVE_INFINITY
    for (const [id, entry] of entries) {
      if (entry.at < oldestAt) {
        oldestAt = entry.at
        oldestId = id
      }
    }
    if (oldestId === null || oldestId === artifactId) {
      break
    }
    entries.delete(oldestId)
  }
}

export function clearKicadArtifactCacheForTests(): void {
  entries.clear()
}
