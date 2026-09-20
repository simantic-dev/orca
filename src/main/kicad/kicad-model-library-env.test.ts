import { describe, expect, it } from 'vitest'
import { kicadModelLibraryEnv } from './kicad-model-library-env'

const APP_BIN = '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
const MODELS = '/Applications/KiCad/KiCad.app/Contents/SharedSupport/3dmodels'

describe('kicadModelLibraryEnv', () => {
  it('points an app-bundle kicad-cli at its own model library when the variable is unset', () => {
    expect(kicadModelLibraryEnv(APP_BIN, 9, {}, (path) => path === MODELS)).toEqual({
      KICAD9_3DMODEL_DIR: MODELS
    })
  })

  it('never overrides a user-set variable and does nothing for other install layouts', () => {
    expect(kicadModelLibraryEnv(APP_BIN, 9, { KICAD9_3DMODEL_DIR: '/mine' }, () => true)).toEqual(
      {}
    )
    expect(kicadModelLibraryEnv('/usr/local/bin/kicad-cli', 9, {}, () => true)).toEqual({})
    expect(kicadModelLibraryEnv(APP_BIN, 9, {}, () => false)).toEqual({})
  })
})
