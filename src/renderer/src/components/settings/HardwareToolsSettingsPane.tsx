import { useCallback } from 'react'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import type { AnalogCliSource, AnalogToolchainInfo } from '../../../../shared/analog-cli-types'
import type { KicadCliAvailability, KicadCliSource } from '../../../../shared/kicad-viewer-contract'
import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { SearchableSetting } from './SearchableSetting'
import { SettingsRow } from './SettingsFormControls'
import { HardwareToolPathRow, type HardwareToolStatus } from './HardwareToolPathRow'
import { getHardwareToolsSearchEntries } from './hardware-tools-search'
import { useHardwareToolProbe } from './use-hardware-tool-probe'

type HardwareToolsSettingsPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => Promise<void>
}

function sourceLabel(source: AnalogCliSource | KicadCliSource): string {
  switch (source) {
    case 'settings':
      return translate(
        'auto.components.settings.HardwareToolsSettingsPane.2977923a38',
        'configured path'
      )
    case 'env':
      return translate(
        'auto.components.settings.HardwareToolsSettingsPane.c9081b7bd0',
        'environment variable'
      )
    case 'path':
      return translate('auto.components.settings.HardwareToolsSettingsPane.001f520f58', 'on PATH')
    case 'app-bundle':
      return translate(
        'auto.components.settings.HardwareToolsSettingsPane.95cefbf5bb',
        'KiCad app bundle'
      )
    case 'simantic-releases':
      return translate(
        'auto.components.settings.HardwareToolsSettingsPane.45d34d85f6',
        'installed release'
      )
  }
}

function kicadStatus(
  availability: KicadCliAvailability | null,
  error: string | null
): HardwareToolStatus {
  if (error) {
    return { kind: 'error', message: error }
  }
  if (!availability) {
    return { kind: 'checking' }
  }
  if (availability.status === 'found') {
    return {
      kind: 'found',
      version: availability.version,
      binaryPath: availability.binaryPath,
      sourceLabel: sourceLabel(availability.source)
    }
  }
  return { kind: availability.status, message: availability.message }
}

function analogStatus(info: AnalogToolchainInfo | null, error: string | null): HardwareToolStatus {
  if (error) {
    return { kind: 'error', message: error }
  }
  if (!info) {
    return { kind: 'checking' }
  }
  if (info.cli.status === 'found') {
    return {
      kind: 'found',
      version: info.cli.version,
      binaryPath: info.cli.binaryPath,
      sourceLabel: sourceLabel(info.cli.source)
    }
  }
  return { kind: 'not-found', message: info.cli.message }
}

export function HardwareToolsSettingsPane({
  settings,
  updateSettings
}: HardwareToolsSettingsPaneProps): React.JSX.Element {
  const analogCliPath = settings.analogCliPath ?? null
  const kicadCliPath = settings.kicadCliPath ?? null

  const loadAnalog = useCallback(
    (refresh: boolean) =>
      callRuntimeRpc<AnalogToolchainInfo>({ kind: 'local' }, 'analog.toolchain', { refresh }),
    []
  )
  const loadKicad = useCallback(
    (refresh: boolean) =>
      callRuntimeRpc<KicadCliAvailability>({ kind: 'local' }, 'kicad.availability', { refresh }),
    []
  )
  const analog = useHardwareToolProbe(loadAnalog, analogCliPath)
  const kicad = useHardwareToolProbe(loadKicad, kicadCliPath)

  return (
    <div className="space-y-4">
      <SearchableSetting
        title={translate(
          'auto.components.settings.HardwareToolsSettingsPane.45bb754d81',
          'Hardware'
        )}
        description={translate(
          'auto.components.settings.HardwareToolsSettingsPane.e90ac8e86a',
          'KiCad project viewer and analog-cli simulation tooling.'
        )}
        keywords={getHardwareToolsSearchEntries().flatMap((entry) => entry.keywords ?? [])}
        className="divide-y divide-border/40"
      >
        <HardwareToolPathRow
          label={translate(
            'auto.components.settings.HardwareToolsSettingsPane.5df4c7c5df',
            'analog-cli'
          )}
          description={translate(
            'auto.components.settings.HardwareToolsSettingsPane.0cac14dadf',
            'The simulator agents run to test boards. Leave empty to use $ANALOG_CLI, PATH, or the newest installed release.'
          )}
          placeholder={translate(
            'auto.components.settings.HardwareToolsSettingsPane.ff8ceb1d0e',
            'Auto-detect'
          )}
          configuredPath={analogCliPath}
          status={analogStatus(analog.value, analog.error)}
          refreshing={analog.loading}
          onSave={(path) => updateSettings({ analogCliPath: path })}
          onRefresh={analog.refresh}
        />
        <HardwareToolPathRow
          label={translate(
            'auto.components.settings.HardwareToolsSettingsPane.c0c80913ad',
            'kicad-cli'
          )}
          description={translate(
            'auto.components.settings.HardwareToolsSettingsPane.228eff2145',
            'Renders schematics and boards for the KiCad project viewer. Leave empty to use $SIMANTIC_KICAD_CLI, PATH, or the KiCad app bundle.'
          )}
          placeholder={translate(
            'auto.components.settings.HardwareToolsSettingsPane.ff8ceb1d0e',
            'Auto-detect'
          )}
          configuredPath={kicadCliPath}
          status={kicadStatus(kicad.value, kicad.error)}
          refreshing={kicad.loading}
          onSave={(path) => updateSettings({ kicadCliPath: path })}
          onRefresh={kicad.refresh}
        />
        <SettingsRow
          label={translate(
            'auto.components.settings.HardwareToolsSettingsPane.9502aa5c2a',
            'Run history'
          )}
          description={
            analog.value ? (
              <code className="rounded bg-muted px-1 py-0.5">{analog.value.historyRoot}</code>
            ) : (
              translate(
                'auto.components.settings.HardwareToolsSettingsPane.5f0d99f703',
                'Where analog-cli records every run on this machine.'
              )
            )
          }
          control={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!analog.value}
              onClick={() => {
                if (analog.value) {
                  void window.api.shell.openPath(analog.value.historyRoot)
                }
              }}
            >
              {translate('auto.components.settings.HardwareToolsSettingsPane.bdc194d56f', 'Reveal')}
            </Button>
          }
        />
      </SearchableSetting>
    </div>
  )
}
