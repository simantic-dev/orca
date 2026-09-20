// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HardwareToolPathRow, type HardwareToolStatus } from './HardwareToolPathRow'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function render(status: HardwareToolStatus, configuredPath: string | null) {
  const onSave = vi.fn(async () => {})
  const onRefresh = vi.fn(async () => {})
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(
      <HardwareToolPathRow
        label="kicad-cli"
        description="Renders boards."
        placeholder="Auto-detect"
        configuredPath={configuredPath}
        status={status}
        refreshing={false}
        onSave={onSave}
        onRefresh={onRefresh}
      />
    )
  })
  return { onSave, onRefresh }
}

afterEach(() => {
  root?.unmount()
  container?.remove()
  root = null
  container = null
})

describe('HardwareToolPathRow', () => {
  it('shows the detected version, binary and source', async () => {
    await render(
      {
        kind: 'found',
        version: '9.0.3',
        binaryPath: '/Applications/KiCad/kicad-cli',
        sourceLabel: 'KiCad app bundle'
      },
      null
    )
    expect(container?.textContent).toContain('Found 9.0.3')
    expect(container?.textContent).toContain('/Applications/KiCad/kicad-cli')
    expect(container?.textContent).toContain('KiCad app bundle')
  })

  it('shows the not-found message and no Clear button without a configured path', async () => {
    await render({ kind: 'not-found', message: 'kicad-cli was not found.' }, null)
    expect(container?.textContent).toContain('Not found')
    expect(container?.textContent).toContain('kicad-cli was not found.')
    expect(container?.querySelector('button[type="button"]:not([aria-label])')).toBeNull()
  })

  it('commits a typed path on Enter and clears it with the Clear button', async () => {
    const { onSave } = await render({ kind: 'checking' }, '/old/kicad-cli')
    const input = container?.querySelector<HTMLInputElement>('input')
    if (!input) {
      throw new Error('input not rendered')
    }
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, '/new/kicad-cli')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(onSave).toHaveBeenCalledWith('/new/kicad-cli')
    const clear = [...(container?.querySelectorAll('button') ?? [])].find(
      (button) => button.textContent === 'Clear'
    )
    await act(async () => {
      clear?.click()
    })
    expect(onSave).toHaveBeenLastCalledWith(null)
  })
})
