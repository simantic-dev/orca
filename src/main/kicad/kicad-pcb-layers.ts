import { open } from 'node:fs/promises'

export type KicadPcbLayer = {
  ordinal: number
  name: string
  kind: string
  userName?: string
}

// The `(layers …)` table sits in the board header, well inside this window even on large boards.
const HEADER_READ_BYTES = 256 * 1024
const LAYER_ROW_RE = /\(\s*(\d+)\s+"([^"]+)"\s+([A-Za-z_]+)(?:\s+"([^"]*)")?\s*\)/g

/** Parses the board's own layer table so the layer picker offers exactly what the board defines. */
export function parseKicadPcbLayers(boardText: string): KicadPcbLayer[] {
  const start = boardText.indexOf('(layers')
  if (start === -1) {
    return []
  }
  let depth = 0
  let end = -1
  for (let index = start; index < boardText.length; index += 1) {
    const char = boardText[index]
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1
      if (depth === 0) {
        end = index
        break
      }
    }
  }
  const block = boardText.slice(start + '(layers'.length, end < 0 ? undefined : end)
  const layers: KicadPcbLayer[] = []
  for (const match of block.matchAll(LAYER_ROW_RE)) {
    const layer: KicadPcbLayer = { ordinal: Number(match[1]), name: match[2], kind: match[3] }
    if (match[4]) {
      layer.userName = match[4]
    }
    layers.push(layer)
  }
  return layers
}

export async function readKicadPcbLayers(pcbPath: string): Promise<KicadPcbLayer[]> {
  const handle = await open(pcbPath, 'r')
  try {
    const buffer = Buffer.alloc(HEADER_READ_BYTES)
    const { bytesRead } = await handle.read(buffer, 0, HEADER_READ_BYTES, 0)
    return parseKicadPcbLayers(buffer.subarray(0, bytesRead).toString('utf8'))
  } finally {
    await handle.close()
  }
}
