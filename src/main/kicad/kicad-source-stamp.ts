import { stat } from 'node:fs/promises'

/** Changes whenever any sheet is saved, so hierarchical edits re-render like root edits do. */
export async function schematicSourceStamp(sheetPaths: readonly string[]): Promise<string> {
  let newest = 0
  for (const path of sheetPaths) {
    const { mtimeMs } = await stat(path)
    newest = Math.max(newest, Math.round(mtimeMs))
  }
  return `sch-${newest}-${sheetPaths.length}`
}

export async function pcbSourceStamp(pcbPath: string): Promise<string> {
  const { mtimeMs, size } = await stat(pcbPath)
  return `pcb-${Math.round(mtimeMs)}-${size}`
}
