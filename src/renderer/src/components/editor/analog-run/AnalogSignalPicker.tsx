import { useState } from 'react'
import { ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { ANALOG_MAX_PLOTTED_SERIES } from './analog-series-palette'

type AnalogSignalPickerProps = {
  columns: string[]
  selected: string[]
  measured: string[]
  onChange: (next: string[]) => void
}

export function AnalogSignalPicker({
  columns,
  selected,
  measured,
  onChange
}: AnalogSignalPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const visible = columns.filter((column) =>
    column.toLowerCase().includes(query.trim().toLowerCase())
  )
  const atLimit = selected.length >= ANALOG_MAX_PLOTTED_SERIES
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <ListFilter />
          {translate('auto.components.editor.analog.run.AnalogSignalPicker.7e88e57597', 'Signals')}
          <span className="text-muted-foreground">
            {selected.length}/{columns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="mb-2 flex items-center gap-1">
          <Input
            value={query}
            placeholder={translate(
              'auto.components.editor.analog.run.AnalogSignalPicker.0cb5868123',
              'Filter signals…'
            )}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={translate(
              'auto.components.editor.analog.run.AnalogSignalPicker.7cc42d1b7d',
              'Filter signals'
            )}
          />
          {measured.length > 0 ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => onChange(measured.filter((name) => columns.includes(name)))}
            >
              {translate(
                'auto.components.editor.analog.run.AnalogSignalPicker.740ba28e22',
                'Measured'
              )}
            </Button>
          ) : null}
          <Button type="button" size="xs" variant="ghost" onClick={() => onChange([])}>
            {translate('auto.components.editor.analog.run.AnalogSignalPicker.cf110fc0a3', 'Clear')}
          </Button>
        </div>
        <div className="scrollbar-sleek max-h-72 space-y-1 overflow-auto">
          {visible.map((column) => {
            const checked = selected.includes(column)
            return (
              <label key={column} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={checked}
                  disabled={!checked && atLimit}
                  onCheckedChange={(value) =>
                    onChange(
                      value === true
                        ? [...selected, column]
                        : selected.filter((name) => name !== column)
                    )
                  }
                />
                <span className="truncate font-mono">{column}</span>
              </label>
            )
          })}
        </div>
        {atLimit ? (
          <div className="mt-2 text-xs text-muted-foreground">
            {translate(
              'auto.components.editor.analog.run.AnalogSignalPicker.6b0a003f4f',
              'At most {{value0}} signals plot at once.',
              { value0: ANALOG_MAX_PLOTTED_SERIES }
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
