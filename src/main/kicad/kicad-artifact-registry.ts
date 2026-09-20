import { createHash } from 'node:crypto'

import type { KicadArtifactMime, KicadArtifactRef } from '../../shared/kicad-viewer-contract'

export type KicadArtifactRecord = KicadArtifactRef & { path: string }

/** Only registered cache files are readable, so artifact reads need no path authorization. */
export class KicadArtifactRegistry {
  private readonly records = new Map<string, KicadArtifactRecord>()

  register(path: string, byteLength: number, mime: KicadArtifactMime): KicadArtifactRef {
    const artifactId = createHash('sha256').update(path).digest('hex').slice(0, 32)
    this.records.set(artifactId, { artifactId, byteLength, mime, path })
    return { artifactId, byteLength, mime }
  }

  resolve(artifactId: string): KicadArtifactRecord | null {
    return this.records.get(artifactId) ?? null
  }

  forgetUnder(directory: string): void {
    for (const [id, record] of this.records) {
      if (record.path.startsWith(directory)) {
        this.records.delete(id)
      }
    }
  }
}
