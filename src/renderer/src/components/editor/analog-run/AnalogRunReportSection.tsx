import { useMemo } from 'react'
import { MonacoEditor } from '../editor-lazy-views'

type AnalogRunReportSectionProps = { fileId: string; report: unknown }

const noop = (): void => {}

export function AnalogRunReportSection({
  fileId,
  report
}: AnalogRunReportSectionProps): React.JSX.Element {
  const content = useMemo(() => JSON.stringify(report ?? null, null, 2), [report])
  return (
    <div className="h-full min-h-0">
      <MonacoEditor
        fileId={`${fileId}/report.json`}
        filePath={`${fileId}/report.json`}
        viewStateKey={`${fileId}/report.json`}
        relativePath="report.json"
        content={content}
        language="json"
        onContentChange={noop}
        onSave={noop}
        readOnly
      />
    </div>
  )
}
