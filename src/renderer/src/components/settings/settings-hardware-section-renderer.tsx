import { HardwareToolsSettingsPane } from './HardwareToolsSettingsPane'
import { SettingsSection } from './SettingsSection'
import { translate } from '@/i18n/i18n'
import type { SettingsRenderContext } from './settings-render-context'

export function renderHardwareSettingsSection(
  context: SettingsRenderContext
): React.JSX.Element | null {
  const { model, navigation, view } = context
  return model.showDesktopOnlySettings ? (
    <SettingsSection
      id="hardware"
      title={translate(
        'auto.components.settings.settings.hardware.section.renderer.fc68d85404',
        'Hardware'
      )}
      description={translate(
        'auto.components.settings.settings.hardware.section.renderer.9c7df2cd66',
        'KiCad project viewer and analog-cli simulation tooling.'
      )}
      searchEntries={navigation.getSectionSearchEntries('hardware')}
    >
      {view.isSectionMounted('hardware') ? (
        <HardwareToolsSettingsPane
          settings={model.settings}
          updateSettings={model.updateSettings}
        />
      ) : null}
    </SettingsSection>
  ) : null
}
