import { describe, expect, it } from 'vitest'
import { KicadArtifactRegistry } from './kicad-artifact-registry'

describe('KicadArtifactRegistry', () => {
  it('hands out stable ids, resolves them, and forgets a directory', () => {
    const registry = new KicadArtifactRegistry()
    const ref = registry.register('/cache/p/sch/s1/a.svg', 10, 'image/svg+xml')
    expect(ref.artifactId).toMatch(/^[0-9a-f]{32}$/)
    expect(registry.register('/cache/p/sch/s1/a.svg', 10, 'image/svg+xml').artifactId).toBe(
      ref.artifactId
    )
    expect(registry.resolve(ref.artifactId)).toMatchObject({
      path: '/cache/p/sch/s1/a.svg',
      byteLength: 10
    })
    registry.forgetUnder('/cache/p/sch/s1')
    expect(registry.resolve(ref.artifactId)).toBeNull()
    expect(registry.resolve('unknown')).toBeNull()
  })
})
