import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getHardwareToolsSearchEntries = createLocalizedCatalog(() => [
  {
    title: translate('auto.components.settings.hardware.tools.search.f134268e72', 'Hardware'),
    description: translate(
      'auto.components.settings.hardware.tools.search.19a6a224ca',
      'KiCad project viewer and analog-cli simulation tooling.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.dd21d65e51',
        'hardware'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.e0d9dbbf63',
        'kicad'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.5a3d8d081f',
        'kicad-cli'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.e931ae7932',
        'analog-cli'
      ),
      ...translateSearchKeyword('auto.components.settings.hardware.tools.search.23b5c94b2c', 'pcb'),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.fe231f16b7',
        'schematic'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.8b94998172',
        'simulation'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.c1790db674',
        'spice'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.hardware.tools.search.38f280094f',
        'run history'
      )
    ]
  }
])
