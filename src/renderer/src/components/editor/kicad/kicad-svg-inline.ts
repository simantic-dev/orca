import DOMPurify from 'dompurify'

export type KicadInlineSvg = {
  markup: string
  /** Natural size in CSS pixels, from the export's declared page size. */
  width: number
  height: number
}

const PX_PER_INCH = 96
const MM_PER_INCH = 25.4

function lengthToPx(value: string | null, fallback: number): number {
  if (!value) {
    return fallback
  }
  const match = /^\s*([0-9.]+)\s*(mm|cm|in|pt|px)?\s*$/.exec(value)
  if (!match) {
    return fallback
  }
  const amount = Number(match[1])
  switch (match[2]) {
    case 'mm':
      return (amount / MM_PER_INCH) * PX_PER_INCH
    case 'cm':
      return (amount / MM_PER_INCH) * PX_PER_INCH * 10
    case 'in':
      return amount * PX_PER_INCH
    case 'pt':
      return (amount / 72) * PX_PER_INCH
    default:
      return amount
  }
}

// kicad-cli writes an XML prolog and an external-DTD DOCTYPE; neither belongs inline in a document.
const XML_PROLOG_RE = /<\?xml[^>]*\?>/gi
const DOCTYPE_RE = /<!DOCTYPE[^>]*>/gi

function parseSvgRoot(markup: string): Element | null {
  const parser = new DOMParser()
  // Why: the HTML parser puts <svg> in the SVG namespace and never fetches a DTD; XML stays as a fallback.
  const fromHtml = parser.parseFromString(markup, 'text/html').querySelector('svg')
  if (fromHtml) {
    return fromHtml
  }
  const xml = parser.parseFromString(markup, 'image/svg+xml').documentElement
  return xml && xml.tagName.toLowerCase() === 'svg' ? xml : null
}

/**
 * Turns a kicad-cli SVG export into markup safe to inline: sanitized, sized by CSS (so zoom is a
 * layout resize that keeps strokes crisp), with its natural pixel size for the fit calculation.
 */
export function prepareKicadInlineSvg(svgText: string): KicadInlineSvg | null {
  const stripped = svgText.replace(XML_PROLOG_RE, '').replace(DOCTYPE_RE, '')
  const sanitized = DOMPurify.sanitize(stripped, { USE_PROFILES: { svg: true, svgFilters: true } })
  const root = parseSvgRoot(sanitized)
  if (!root) {
    return null
  }
  const viewBox = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const viewBoxWidth = viewBox.length === 4 && viewBox[2] > 0 ? viewBox[2] : 0
  const viewBoxHeight = viewBox.length === 4 && viewBox[3] > 0 ? viewBox[3] : 0
  // KiCad's exports declare the page in millimetres and a matching viewBox; fall back to mm units.
  const width = lengthToPx(root.getAttribute('width'), (viewBoxWidth / MM_PER_INCH) * PX_PER_INCH)
  const height = lengthToPx(
    root.getAttribute('height'),
    (viewBoxHeight / MM_PER_INCH) * PX_PER_INCH
  )
  if (!(width > 0) || !(height > 0)) {
    return null
  }
  if (!root.getAttribute('viewBox')) {
    root.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  root.setAttribute('width', '100%')
  root.setAttribute('height', '100%')
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  return { markup: new XMLSerializer().serializeToString(root), width, height }
}
