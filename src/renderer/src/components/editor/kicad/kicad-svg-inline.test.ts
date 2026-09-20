// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'

// Why: happy-dom parses <svg> without its namespace, which makes DOMPurify drop the root; the
// sanitizer's own contract is exercised in a real renderer, so here it passes markup through.
const sanitize = vi.hoisted(() => vi.fn((markup: string) => markup))
vi.mock('dompurify', () => ({ default: { sanitize } }))

import { prepareKicadInlineSvg } from './kicad-svg-inline'

describe('prepareKicadInlineSvg', () => {
  it('converts the declared millimetre page size to pixels and sizes the svg by CSS', () => {
    const svg = prepareKicadInlineSvg(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210"><path d="M1 1"/></svg>'
    )
    expect(svg).not.toBeNull()
    expect(svg?.width).toBeCloseTo(1122.5, 0)
    expect(svg?.height).toBeCloseTo(793.7, 0)
    expect(svg?.markup).toContain('width="100%"')
    expect(svg?.markup).toContain('height="100%"')
    expect(svg?.markup).toContain('preserveAspectRatio="xMidYMid meet"')
    expect(svg?.markup).not.toContain('<?xml')
  })

  it('runs the export through DOMPurify with the svg profile before inlining', () => {
    sanitize.mockClear()
    prepareKicadInlineSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm"><rect/></svg>'
    )
    expect(sanitize).toHaveBeenCalledWith(
      expect.stringContaining('<rect'),
      expect.objectContaining({ USE_PROFILES: { svg: true, svgFilters: true } })
    )
  })

  it('falls back to viewBox units as millimetres and rejects non-svg text', () => {
    const svg = prepareKicadInlineSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25.4 50.8"><g/></svg>'
    )
    expect(svg?.width).toBeCloseTo(96, 0)
    expect(svg?.height).toBeCloseTo(192, 0)
    expect(prepareKicadInlineSvg('<html><body>nope</body></html>')).toBeNull()
  })
})
