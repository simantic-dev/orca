import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { kicadListProjects, resolveKicadHost } from '@/runtime/kicad-rpc-client'
import { useAppStore } from '@/store'
import { useKicadProjectPickerStore } from './kicad-project-picker-store'

function joinWorkspacePath(root: string, relativePath: string): string {
  const separator = root.includes('\\') && !root.includes('/') ? '\\' : '/'
  const normalizedRelative = separator === '\\' ? relativePath.replaceAll('/', '\\') : relativePath
  return `${root.replace(/[\\/]+$/, '')}${separator}${normalizedRelative}`
}

/** Opens a `.kicad_pro` as an editor tab; the editor family renders the viewer for that language. */
export function openKicadProjectFile(
  worktreeId: string,
  groupId: string,
  proRelativePath: string
): void {
  const state = useAppStore.getState()
  const root = state.getKnownWorktreeById(worktreeId)?.path
  if (!root) {
    toast.error(
      translate(
        'auto.lib.open.kicad.project.tab.2ab82df96b',
        'The workspace is no longer available.'
      )
    )
    return
  }
  state.openFile(
    {
      filePath: joinWorkspacePath(root, proRelativePath),
      relativePath: proRelativePath,
      worktreeId,
      language: 'kicad-project',
      mode: 'edit'
    },
    { targetGroupId: groupId }
  )
}

export async function openKicadProjectInWorkspace(
  worktreeId: string,
  groupId: string
): Promise<void> {
  const host = resolveKicadHost(worktreeId)
  if (host.kind === 'unsupported') {
    toast.error(
      translate(
        'auto.lib.open.kicad.project.tab.958be9efa1',
        'The KiCad viewer is not available on remote workspaces yet.'
      )
    )
    return
  }
  if (host.kind === 'unresolved') {
    toast.error(
      translate(
        'auto.lib.open.kicad.project.tab.f678bad152',
        'The workspace host is not known yet. Try again in a moment.'
      )
    )
    return
  }
  let projects
  try {
    projects = (await kicadListProjects(worktreeId)).projects
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error))
    return
  }
  if (projects.length === 0) {
    toast.info(
      translate(
        'auto.lib.open.kicad.project.tab.9cf9a86c64',
        'No KiCad project (.kicad_pro) was found in this workspace.'
      )
    )
    return
  }
  if (projects.length === 1) {
    openKicadProjectFile(worktreeId, groupId, projects[0].proRelativePath)
    return
  }
  useKicadProjectPickerStore.getState().open({ worktreeId, groupId, projects })
}
