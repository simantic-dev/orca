import type { AnalogRunSummary } from '../../../../../../shared/analog-cli-types'
import { getAnalogRun } from '@/runtime/analog-runs-client'
import type { EditorGet, EditorSet } from '../types/editor-set-get'
import type { EditorSlice } from '../types/editor-slice'
import type { OpenFile } from '../types/open-file'
import {
  buildAnalogRunTabId,
  getAnalogRunTabLabel,
  type OpenAnalogRunState
} from '../types/analog-run-tab-state'
import { openWorkspaceEditorItem } from '../tabs/workspace-editor-item'

let analogRunRequestSeq = 0

export function createAnalogRunActions(
  set: EditorSet,
  get: EditorGet
): Pick<EditorSlice, 'openAnalogRun' | 'patchOpenAnalogRun' | 'reloadOpenAnalogRunTab'> {
  const load = async (fileId: string, worktreeId: string, historyId: string): Promise<void> => {
    const requestId = ++analogRunRequestSeq
    get().patchOpenAnalogRun(fileId, { loading: true, error: null, requestId })
    try {
      const manifest = await getAnalogRun(worktreeId, historyId)
      const current = get().openFiles.find((file) => file.id === fileId)?.analogRun
      if (current?.requestId === requestId) {
        get().patchOpenAnalogRun(fileId, {
          manifest,
          summary: manifest,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      const current = get().openFiles.find((file) => file.id === fileId)?.analogRun
      if (current?.requestId === requestId) {
        get().patchOpenAnalogRun(fileId, {
          loading: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  return {
    // Why: mirrors check-details — a virtual editor tab keyed by a synthetic id, never a path on disk.
    openAnalogRun: (worktreeId, summary: AnalogRunSummary, options) => {
      const id = buildAnalogRunTabId(worktreeId, summary.id)
      const label = getAnalogRunTabLabel(summary)
      set((state) => {
        const existing = state.openFiles.find((file) => file.id === id)
        if (existing) {
          return {
            openFiles: state.openFiles.map((file) =>
              file.id === id && file.analogRun
                ? { ...file, analogRun: { ...file.analogRun, summary } }
                : file
            ),
            activeFileId: id,
            activeTabType: 'editor',
            activeFileIdByWorktree: { ...state.activeFileIdByWorktree, [worktreeId]: id },
            activeTabTypeByWorktree: { ...state.activeTabTypeByWorktree, [worktreeId]: 'editor' }
          }
        }
        const analogRun: OpenAnalogRunState = {
          worktreeId,
          historyId: summary.id,
          summary,
          manifest: null,
          loading: true,
          error: null,
          requestId: 0
        }
        const newFile: OpenFile = {
          id,
          filePath: id,
          relativePath: label,
          worktreeId,
          language: 'plaintext',
          isDirty: false,
          mode: 'analog-run',
          analogRun
        }
        return {
          openFiles: [...state.openFiles, newFile],
          activeFileId: id,
          activeTabType: 'editor',
          activeFileIdByWorktree: { ...state.activeFileIdByWorktree, [worktreeId]: id },
          activeTabTypeByWorktree: { ...state.activeTabTypeByWorktree, [worktreeId]: 'editor' }
        }
      })
      void openWorkspaceEditorItem(
        get(),
        id,
        worktreeId,
        label,
        'editor',
        false,
        options?.targetGroupId
      )
      void load(id, worktreeId, summary.id)
    },

    patchOpenAnalogRun: (fileId, patch) => {
      set((state) => ({
        openFiles: state.openFiles.map((file) =>
          file.id === fileId && file.analogRun
            ? {
                ...file,
                relativePath: patch.summary
                  ? getAnalogRunTabLabel(patch.summary)
                  : file.relativePath,
                analogRun: { ...file.analogRun, ...patch }
              }
            : file
        )
      }))
    },

    reloadOpenAnalogRunTab: async (fileId) => {
      const current = get().openFiles.find((file) => file.id === fileId)?.analogRun
      if (!current) {
        return
      }
      await load(fileId, current.worktreeId, current.historyId)
    }
  }
}
