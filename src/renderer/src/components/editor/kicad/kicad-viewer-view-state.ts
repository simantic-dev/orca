export type KicadViewerView = 'schematic' | 'pcb' | 'pcb3d'
export type KicadPcbSide = 'front' | 'back'

export type KicadViewerViewState = {
  view: KicadViewerView
  sheetId: string | null
  side: KicadPcbSide
  layersBySide: Record<KicadPcbSide, string[] | null>
  zoomByView: Record<string, number>
}

const states = new Map<string, KicadViewerViewState>()

function defaultState(): KicadViewerViewState {
  return {
    view: 'schematic',
    sheetId: null,
    side: 'front',
    layersBySide: { front: null, back: null },
    zoomByView: {}
  }
}

/** Survives tab switches (the editor remounts its surface) without touching persisted session state. */
export function getKicadViewerViewState(key: string): KicadViewerViewState {
  const existing = states.get(key)
  if (existing) {
    return existing
  }
  const created = defaultState()
  states.set(key, created)
  return created
}

export function updateKicadViewerViewState(
  key: string,
  patch: Partial<KicadViewerViewState>
): KicadViewerViewState {
  const next = { ...getKicadViewerViewState(key), ...patch }
  states.set(key, next)
  return next
}

export function clearKicadViewerViewStateForTests(): void {
  states.clear()
}
