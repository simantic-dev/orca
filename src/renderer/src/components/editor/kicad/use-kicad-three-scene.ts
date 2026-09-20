import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
  type Material,
  type Mesh,
  type Object3D,
  type Texture
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  cameraDirectionForPreset,
  fitDistanceForBox,
  type KicadCameraPreset
} from './kicad-three-camera-fit'

export type KicadThreeSceneStatus = 'idle' | 'parsing' | 'ready' | 'context-lost' | 'error'

type SceneHandles = {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  controls: OrbitControls
  model: Object3D | null
  bounds: Box3 | null
  render: () => void
}

const CAMERA_FOV = 40
const MAX_PIXEL_RATIO = 2

function isMesh(node: Object3D): node is Mesh {
  return 'isMesh' in node && node.isMesh === true
}

function isTexture(value: unknown): value is Texture {
  return (
    typeof value === 'object' && value !== null && 'isTexture' in value && value.isTexture === true
  )
}

function buildEnvironmentTexture(renderer: WebGLRenderer): Texture {
  const generator = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const { texture } = generator.fromScene(room, 0.04)
  room.dispose()
  generator.dispose()
  return texture
}

function isCanvasContextLost(canvas: HTMLCanvasElement): boolean {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  return gl !== null && gl.isContextLost()
}

function disposeObject(object: Object3D): void {
  object.traverse((node) => {
    if (!isMesh(node)) {
      return
    }
    node.geometry.dispose()
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material]
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (isTexture(value)) {
          value.dispose()
        }
      }
      material.dispose()
    }
  })
}

/**
 * Owns one WebGL context per mounted 3D view: created on mount, rendered on demand (no animation
 * loop), and torn down completely on unmount so tab switches never leak contexts.
 */
export function useKicadThreeScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  hostRef: RefObject<HTMLDivElement | null>,
  bytes: Uint8Array | null,
  backgroundColor: string
): {
  status: KicadThreeSceneStatus
  errorMessage: string | null
  /** Bumps on retry; key the canvas on it so a lost context is replaced, not reused. */
  generation: number
  setPreset: (preset: KicadCameraPreset) => void
  retry: () => void
} {
  const handlesRef = useRef<SceneHandles | null>(null)
  const [status, setStatus] = useState<KicadThreeSceneStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)

  const frame = useCallback((preset: KicadCameraPreset) => {
    const handles = handlesRef.current
    if (!handles?.bounds) {
      return
    }
    const size = handles.bounds.getSize(new Vector3())
    const center = handles.bounds.getCenter(new Vector3())
    const distance = fitDistanceForBox(size, CAMERA_FOV, handles.camera.aspect)
    const direction = cameraDirectionForPreset(preset)
    handles.camera.position.set(
      center.x + direction.x * distance,
      center.y + direction.y * distance,
      center.z + direction.z * distance
    )
    handles.camera.near = distance / 100
    handles.camera.far = distance * 100
    handles.camera.updateProjectionMatrix()
    handles.controls.target.copy(center)
    handles.controls.update()
    handles.render()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) {
      return
    }
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
    } catch (error) {
      // Why: three.js reports a lost context as a null-precision TypeError; surface it as
      // recoverable so Retry can mount a fresh canvas instead of showing the raw message.
      if (isCanvasContextLost(canvas)) {
        setStatus('context-lost')
        return
      }
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'WebGL is not available')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
    renderer.toneMapping = ACESFilmicToneMapping
    const scene = new Scene()
    scene.background = new Color(backgroundColor)
    // Why: kicad-cli exports every footprint model as metalness 1, and a metal surface only shows
    // what it reflects, so without an environment map the MCU and passives render black.
    const environment = buildEnvironmentTexture(renderer)
    scene.environment = environment
    scene.add(new HemisphereLight(0xffffff, 0x444444, 0.5))
    scene.add(new AmbientLight(0xffffff, 0.15))
    const sun = new DirectionalLight(0xffffff, 1.2)
    sun.position.set(1, -1, 2)
    scene.add(sun)
    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000)
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = false
    const render = (): void => {
      renderer.render(scene, camera)
    }
    const handles: SceneHandles = {
      renderer,
      scene,
      camera,
      controls,
      model: null,
      bounds: null,
      render
    }
    handlesRef.current = handles
    controls.addEventListener('change', render)
    const resize = (): void => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    const onContextLost = (event: Event): void => {
      event.preventDefault()
      setStatus('context-lost')
    }
    canvas.addEventListener('webglcontextlost', onContextLost)
    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      observer.disconnect()
      controls.removeEventListener('change', render)
      controls.dispose()
      if (handles.model) {
        disposeObject(handles.model)
      }
      environment.dispose()
      renderer.dispose()
      // Why: StrictMode replays this effect on the same canvas, and a forced loss is permanent
      // for that element, so the next WebGLRenderer would throw. Only release the GPU context
      // once the canvas itself is gone from the document (unmount or a keyed remount).
      if (!canvas.isConnected) {
        renderer.forceContextLoss()
      }
      handlesRef.current = null
    }
    // Why: the context is rebuilt only on retry; background changes are applied in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, hostRef, generation])

  useEffect(() => {
    const handles = handlesRef.current
    if (!handles) {
      return
    }
    handles.scene.background = new Color(backgroundColor)
    handles.render()
  }, [backgroundColor, generation])

  useEffect(() => {
    const handles = handlesRef.current
    if (!handles || !bytes) {
      return
    }
    setStatus('parsing')
    setErrorMessage(null)
    let cancelled = false
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    new GLTFLoader().parse(
      buffer,
      '',
      (gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene)
          return
        }
        if (handles.model) {
          handles.scene.remove(handles.model)
          disposeObject(handles.model)
        }
        handles.model = gltf.scene
        handles.bounds = new Box3().setFromObject(gltf.scene)
        handles.scene.add(gltf.scene)
        frame('iso')
        setStatus('ready')
      },
      (event) => {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(event instanceof Error ? event.message : 'the model could not be parsed')
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [bytes, frame, generation])

  const retry = useCallback(() => {
    setStatus('idle')
    setErrorMessage(null)
    setGeneration((current) => current + 1)
  }, [])

  return { status, errorMessage, generation, setPreset: frame, retry }
}
