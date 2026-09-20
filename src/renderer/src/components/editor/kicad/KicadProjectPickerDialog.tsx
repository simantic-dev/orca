import { CircuitBoard } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import { useKicadProjectPickerStore } from '@/lib/kicad-project-picker-store'
import { openKicadProjectFile } from '@/lib/open-kicad-project-tab'

export default function KicadProjectPickerDialog(): React.JSX.Element {
  const request = useKicadProjectPickerStore((state) => state.request)
  const close = useKicadProjectPickerStore((state) => state.close)
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) {
          close()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.components.editor.kicad.KicadProjectPickerDialog.a96e87c025',
              'View KiCad Project'
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.editor.kicad.KicadProjectPickerDialog.dfb7666acb',
              'This workspace has several KiCad projects. Pick one to open.'
            )}
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder={translate(
              'auto.components.editor.kicad.KicadProjectPickerDialog.c397b1fe8a',
              'Filter projects…'
            )}
          />
          <CommandList>
            <CommandEmpty>
              {translate(
                'auto.components.editor.kicad.KicadProjectPickerDialog.680289ac4f',
                'No matching project.'
              )}
            </CommandEmpty>
            {(request?.projects ?? []).map((project) => (
              <CommandItem
                key={project.proRelativePath}
                value={project.proRelativePath}
                onSelect={() => {
                  if (request) {
                    openKicadProjectFile(
                      request.worktreeId,
                      request.groupId,
                      project.proRelativePath
                    )
                  }
                  close()
                }}
              >
                <CircuitBoard className="size-4 text-muted-foreground" />
                <span className="truncate">{project.name}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {project.dirRelativePath || '/'}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
