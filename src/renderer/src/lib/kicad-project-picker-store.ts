import { create } from 'zustand'
import type { KicadProjectListing } from '../../../shared/kicad-viewer-contract'

export type KicadProjectPickerRequest = {
  worktreeId: string
  groupId: string
  projects: KicadProjectListing[]
}

type KicadProjectPickerState = {
  request: KicadProjectPickerRequest | null
  open: (request: KicadProjectPickerRequest) => void
  close: () => void
}

/** One app-level picker: the "+" menu asks from any pane, the dialog mounts once at the root. */
export const useKicadProjectPickerStore = create<KicadProjectPickerState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null })
}))
