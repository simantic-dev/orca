import { useState } from 'react'
import { KicadPcbLayerView } from './KicadPcbLayerView'
import { KicadSchematicView } from './KicadSchematicView'
import { KicadViewerEmptyState } from './KicadViewerEmptyState'
import { KicadViewerToolbar } from './KicadViewerToolbar'
import { KicadPcb3dView } from './kicad-lazy-views'
import {
  getKicadViewerViewState,
  updateKicadViewerViewState,
  type KicadViewerView
} from './kicad-viewer-view-state'
import { useKicadProject } from './use-kicad-project'
import { useKicadProjectSourceRevision } from './use-kicad-project-source-watch'

type KicadProjectViewerProps = {
  filePath: string
  relativePath: string
  worktreeId: string
  viewStateKey: string
}

export default function KicadProjectViewer({
  filePath,
  relativePath,
  worktreeId,
  viewStateKey
}: KicadProjectViewerProps): React.JSX.Element {
  const revision = useKicadProjectSourceRevision(filePath)
  const { state, retry } = useKicadProject(worktreeId, relativePath, revision)
  const [view, setView] = useState<KicadViewerView>(
    () => getKicadViewerViewState(viewStateKey).view
  )
  const [forceToken, setForceToken] = useState(0)

  if (state.status === 'resolving') {
    return <KicadViewerEmptyState variant="loading" />
  }
  if (state.status === 'unavailable') {
    return (
      <KicadViewerEmptyState
        variant={state.error.variant}
        message={state.error.message}
        detail={state.error.detail}
        onRetry={retry}
      />
    )
  }
  const { info } = state
  const effectiveView: KicadViewerView = info.hasPcb || view === 'schematic' ? view : 'schematic'
  return (
    <div className="flex h-full min-h-0 flex-col">
      <KicadViewerToolbar
        view={effectiveView}
        projectName={info.name}
        hasPcb={info.hasPcb}
        onViewChange={(next) => {
          setView(next)
          updateKicadViewerViewState(viewStateKey, { view: next })
        }}
        onRefresh={() => setForceToken((current) => current + 1)}
      />
      <div className="min-h-0 flex-1">
        {effectiveView === 'schematic' ? (
          <KicadSchematicView
            worktreeId={worktreeId}
            relativePath={relativePath}
            viewStateKey={viewStateKey}
            revision={revision}
            forceToken={forceToken}
          />
        ) : effectiveView === 'pcb' ? (
          <KicadPcbLayerView
            worktreeId={worktreeId}
            relativePath={relativePath}
            viewStateKey={viewStateKey}
            revision={revision}
            forceToken={forceToken}
          />
        ) : (
          <KicadPcb3dView
            worktreeId={worktreeId}
            relativePath={relativePath}
            viewStateKey={viewStateKey}
            revision={revision}
            forceToken={forceToken}
          />
        )}
      </div>
    </div>
  )
}
