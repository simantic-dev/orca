// @vitest-environment happy-dom
import { StrictMode, useRef } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Three from 'three'
import { useKicadThreeScene } from './use-kicad-three-scene'

// Why: three.js keeps using a canvas whose context was force-lost and throws this exact
// TypeError from WebGLCapabilities; the fake reproduces that contract per canvas element.
const lostCanvases = new WeakSet<HTMLCanvasElement>()
let everyCanvasLost = false
const constructedOn: HTMLCanvasElement[] = []
const forceContextLoss = vi.fn()
const environmentDispose = vi.fn()

function isLost(canvas: HTMLCanvasElement): boolean {
  return everyCanvasLost || lostCanvases.has(canvas)
}

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof Three>()
  class FakeWebGLRenderer {
    private readonly canvas: HTMLCanvasElement
    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
      if (isLost(canvas)) {
        throw new TypeError("Cannot read properties of null (reading 'precision')")
      }
      constructedOn.push(canvas)
      this.canvas = canvas
    }
    setPixelRatio(): void {}
    setSize(): void {}
    render(): void {}
    dispose(): void {}
    forceContextLoss(): void {
      forceContextLoss()
      lostCanvases.add(this.canvas)
    }
  }
  class FakePMREMGenerator {
    fromScene(): { texture: { dispose: () => void } } {
      return { texture: { dispose: environmentDispose } }
    }
    dispose(): void {}
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer, PMREMGenerator: FakePMREMGenerator }
})
vi.mock('three/addons/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: class {
    dispose(): void {}
  }
}))
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    target = { copy(): void {} }
    enableDamping = false
    addEventListener(): void {}
    removeEventListener(): void {}
    update(): void {}
    dispose(): void {}
  }
}))
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    parse(): void {}
  }
}))

const originalGetContext = HTMLCanvasElement.prototype.getContext

type Scene = ReturnType<typeof useKicadThreeScene>
let latest: Scene | null = null

function Probe(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  latest = useKicadThreeScene(canvasRef, hostRef, null, '#000000')
  return (
    <div ref={hostRef}>
      <canvas key={latest.generation} ref={canvasRef} data-testid="canvas" />
    </div>
  )
}

function scene(): Scene {
  if (!latest) {
    throw new Error('hook did not render')
  }
  return latest
}

describe('useKicadThreeScene context lifecycle', () => {
  beforeEach(() => {
    constructedOn.length = 0
    everyCanvasLost = false
    forceContextLoss.mockClear()
    environmentDispose.mockClear()
    latest = null
    // Why: happy-dom has no WebGL; Reflect.set installs the stub without a type assertion.
    Reflect.set(HTMLCanvasElement.prototype, 'getContext', function (this: HTMLCanvasElement) {
      return { isContextLost: () => isLost(this) }
    })
  })
  afterEach(() => {
    cleanup()
    Reflect.set(HTMLCanvasElement.prototype, 'getContext', originalGetContext)
  })

  it('survives a StrictMode effect replay on the same canvas', () => {
    const view = render(<Probe />, { wrapper: StrictMode })
    const canvas = view.getByTestId('canvas')
    expect(scene().status).toBe('idle')
    expect(constructedOn).toEqual([canvas, canvas])
    expect(forceContextLoss).not.toHaveBeenCalled()
    view.unmount()
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
    // Why: one environment texture per renderer; both the replayed and the final mount release theirs.
    expect(environmentDispose).toHaveBeenCalledTimes(2)
  })

  it('replaces the canvas on retry after the context is lost', () => {
    const view = render(<Probe />)
    const first = view.getByTestId('canvas')
    act(() => {
      first.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })
    expect(scene().status).toBe('context-lost')
    act(() => {
      scene().retry()
    })
    const second = view.getByTestId('canvas')
    expect(second).not.toBe(first)
    expect(scene().status).toBe('idle')
    expect(constructedOn.at(-1)).toBe(second)
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('reports a lost context as recoverable instead of the raw three.js error', () => {
    everyCanvasLost = true
    render(<Probe />)
    expect(scene().status).toBe('context-lost')
    expect(scene().errorMessage).toBeNull()
    expect(constructedOn).toEqual([])
  })
})
