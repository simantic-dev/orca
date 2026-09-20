import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { detectLanguage } from '@/lib/language-detect'
import { openFileInBrowserTab } from '@/lib/file-preview'
import { useAppStore } from '@/store'

/** HTML reports open in a browser tab; JSON, CSV and text open as read-only editor tabs. */
export async function openAnalogArtifact(worktreeId: string, filePath: string): Promise<void> {
  if (/\.html?$/i.test(filePath)) {
    const plan = openFileInBrowserTab({ filePath, worktreeId })
    if (plan.status === 'unsupported') {
      toast.error(
        translate(
          'auto.components.editor.analog.run.analog.artifact.open.d0109c94c0',
          'This report cannot be previewed here.'
        )
      )
    }
    return
  }
  try {
    await window.api.fs.authorizeExternalPath({ targetPath: filePath })
  } catch {
    toast.error(
      translate(
        'auto.components.editor.analog.run.analog.artifact.open.1f04864008',
        'Orca is not allowed to open this file.'
      )
    )
    return
  }
  useAppStore.getState().openFile({
    filePath,
    relativePath: filePath,
    worktreeId,
    language: detectLanguage(filePath),
    mode: 'edit',
    readOnly: true,
    runtimeEnvironmentId: null
  })
}
