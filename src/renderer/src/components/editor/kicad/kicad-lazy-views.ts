import { lazyWithRetry as lazy } from '@/lib/lazy-with-retry'

// Why: three.js only loads when someone opens the 3D view, so the editor bundle stays unchanged.
export const KicadPcb3dView = lazy(() => import('./KicadPcb3dView'), { reloadKey: 'kicad-pcb-3d' })
