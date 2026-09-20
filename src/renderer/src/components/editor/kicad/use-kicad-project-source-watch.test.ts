import { describe, expect, it } from 'vitest'
import { kicadProjectDirectory, payloadTouchesKicadSources } from './use-kicad-project-source-watch'

describe('kicad project source watch', () => {
  it('derives the project directory from either path flavour', () => {
    expect(kicadProjectDirectory('/w/boards/demo/demo.kicad_pro')).toBe('/w/boards/demo')
    expect(kicadProjectDirectory('C:\\w\\demo\\demo.kicad_pro')).toBe('C:\\w\\demo')
  })

  it('reacts to schematic and board edits inside the project, and to overflow', () => {
    const dir = '/w/boards/demo'
    expect(
      payloadTouchesKicadSources(
        {
          worktreePath: '/w',
          events: [{ kind: 'update', absolutePath: '/w/boards/demo/infra.kicad_sch' }]
        },
        dir
      )
    ).toBe(true)
    expect(
      payloadTouchesKicadSources(
        {
          worktreePath: '/w',
          events: [{ kind: 'update', absolutePath: '/w/boards/demo/notes.md' }]
        },
        dir
      )
    ).toBe(false)
    expect(
      payloadTouchesKicadSources(
        { worktreePath: '/w', events: [{ kind: 'update', absolutePath: '/w/other/x.kicad_pcb' }] },
        dir
      )
    ).toBe(false)
    expect(
      payloadTouchesKicadSources(
        { worktreePath: '/w', events: [{ kind: 'overflow', absolutePath: '/w' }] },
        dir
      )
    ).toBe(true)
  })
})
