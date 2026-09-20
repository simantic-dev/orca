#!/usr/bin/env node
// Render every committed app icon from resources/icon-source/simantic-logo-inverted.svg.
// Produces resources/build/icon.png + icon.icns + icon.ico, resources/icon.png,
// resources/icon-dev.png, and the macOS menu-bar template PNGs. Rasterizes with
// the repo's own Electron through hidden offscreen windows, so it runs on every
// desktop OS without a browser download; only the .icns step needs macOS
// (iconutil) and is skipped elsewhere.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// Why: under plain Node, `electron` resolves to the binary path; re-exec so the
// rest of the file runs inside Electron's main process.
if (!process.versions.electron) {
  const { default: electronPath } = await import('electron')
  execFileSync(electronPath, ['--force-device-scale-factor=1', import.meta.filename], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
  })
  process.exit(0)
}
const { app, BrowserWindow } = await import('electron')
// Why: offscreen windows paint at the primary display's scale; icons need 1 px per CSS px.
app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.dock?.hide()

const projectDir = dirname(dirname(import.meta.dirname))
const sourceSvgPath = join(projectDir, 'resources', 'icon-source', 'simantic-logo-inverted.svg')

// The brand SVG is a 200-unit square: white ground, black rounded square at
// (41,41) 118x118 rx=10, white dot at (56,144) r=9.
const LOGO_UNITS = 200
const LOGO_SQUARE = { x: 41, y: 41, size: 118, rx: 10 }
const LOGO_DOT = { cx: 56, cy: 144, r: 9 }
// Why: macOS renders app icons inside an 824/1024 rounded square and expects the
// artwork's shadow to live in the transparent margin; Windows/Linux frames are
// trimmed from the same render by trim-windows-icon-source.mjs.
const MAC_INSET_RATIO = 100 / 1024
const MAC_CORNER_RATIO = 0.2237
const DEV_BADGE_COLOR = 'rgb(255, 107, 43)'

function assertLogoGeometry() {
  const svg = readFileSync(sourceSvgPath, 'utf8')
  for (const needle of [
    'x="41" y="41" width="118" height="118" rx="10"',
    'cx="56" cy="144" r="9"'
  ]) {
    if (!svg.includes(needle)) {
      throw new Error(
        `${sourceSvgPath} no longer matches the geometry this script encodes (${needle})`
      )
    }
  }
}

function tileMarkup({ size, inset, shadow, badge }) {
  const tile = size - inset * 2
  const scale = tile / LOGO_UNITS
  const rx = tile * MAC_CORNER_RATIO
  const square = {
    x: inset + LOGO_SQUARE.x * scale,
    y: inset + LOGO_SQUARE.y * scale,
    size: LOGO_SQUARE.size * scale,
    rx: LOGO_SQUARE.rx * scale
  }
  const dot = {
    cx: inset + LOGO_DOT.cx * scale,
    cy: inset + LOGO_DOT.cy * scale,
    r: LOGO_DOT.r * scale
  }
  const shadowFilter = shadow
    ? `<filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${(size * 0.008).toFixed(2)}" stdDeviation="${(size * 0.014).toFixed(2)}" flood-color="#000" flood-opacity="0.32"/></filter>`
    : ''
  const badgeMarkup = badge
    ? `<circle cx="${(size * 0.875).toFixed(2)}" cy="${(size * 0.867).toFixed(2)}" r="${(size * 0.117).toFixed(2)}" fill="${DEV_BADGE_COLOR}"/><text x="${(size * 0.875).toFixed(2)}" y="${(size * 0.867).toFixed(2)}" fill="#fff" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="${(size * 0.15).toFixed(2)}" text-anchor="middle" dominant-baseline="central">D</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>${shadowFilter}</defs>
<rect x="${inset}" y="${inset}" width="${tile}" height="${tile}" rx="${rx.toFixed(2)}" fill="#ffffff"${shadow ? ' filter="url(#s)"' : ''}/>
<rect x="${inset + 0.5}" y="${inset + 0.5}" width="${tile - 1}" height="${tile - 1}" rx="${(rx - 0.5).toFixed(2)}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
<rect x="${square.x.toFixed(2)}" y="${square.y.toFixed(2)}" width="${square.size.toFixed(2)}" height="${square.size.toFixed(2)}" rx="${square.rx.toFixed(2)}" fill="#000000"/>
<circle cx="${dot.cx.toFixed(2)}" cy="${dot.cy.toFixed(2)}" r="${dot.r.toFixed(2)}" fill="#ffffff"/>
${badgeMarkup}</svg>`
}

// Menu-bar template: black-with-alpha only, the dot punched out so it shows the bar.
function trayMarkup({ width, height }) {
  const size = height
  const x0 = (width - size) / 2
  const scale = size / LOGO_SQUARE.size
  const rx = LOGO_SQUARE.rx * scale
  const dot = {
    cx: x0 + (LOGO_DOT.cx - LOGO_SQUARE.x) * scale,
    cy: (LOGO_DOT.cy - LOGO_SQUARE.y) * scale,
    r: LOGO_DOT.r * scale
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><mask id="m"><rect width="${width}" height="${height}" fill="#fff"/><circle cx="${dot.cx.toFixed(2)}" cy="${dot.cy.toFixed(2)}" r="${dot.r.toFixed(2)}" fill="#000"/></mask><rect x="${x0}" y="0" width="${size}" height="${size}" rx="${rx.toFixed(2)}" fill="#000" mask="url(#m)"/></svg>`
}

let renderWindow = null

// Why: one hidden offscreen window for every size; each navigation to a data: URL
// would spawn a fresh renderer, which is slow and fails under some sandboxes.
async function getRenderWindow() {
  if (renderWindow) {
    return renderWindow
  }
  renderWindow = new BrowserWindow({
    show: false,
    width: 64,
    height: 64,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true }
  })
  await renderWindow.loadURL(
    'data:text/html;charset=utf-8,<!doctype html><html><body style="margin:0;background:transparent"></body></html>'
  )
  return renderWindow
}

async function renderPng(svg, width, height) {
  const win = await getRenderWindow()
  const painted = new Promise((resolve) => win.webContents.once('paint', () => resolve()))
  win.setContentSize(width, height)
  await win.webContents.executeJavaScript(
    `document.body.innerHTML = ${JSON.stringify(svg)}; new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`
  )
  await Promise.race([painted, new Promise((resolve) => setTimeout(resolve, 300))])
  let image = await win.webContents.capturePage({ x: 0, y: 0, width, height })
  const size = image.getSize()
  // Why: Retina displays can still paint offscreen at 2x; downscale rather than
  // ship an icon slot at the wrong pixel size.
  if (size.width !== width || size.height !== height) {
    image = image.resize({ width, height, quality: 'best' })
  }
  return image.toPNG()
}

function macTile(size, { badge = false } = {}) {
  return tileMarkup({ size, inset: Math.round(size * MAC_INSET_RATIO), shadow: true, badge })
}

// Why: Finder list views draw the 16/32/64 .icns slots as-is, so those get a
// margin-free tile (generate.sh used to trim them with ImageMagick).
function smallSlotTile(size) {
  return tileMarkup({
    size,
    inset: Math.max(1, Math.round(size * 0.02)),
    shadow: false,
    badge: false
  })
}

const ICONSET_SLOTS = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

async function main() {
  assertLogoGeometry()
  const out = (...parts) => join(projectDir, 'resources', ...parts)
  writeFileSync(out('build', 'icon.png'), await renderPng(macTile(1024), 1024, 1024))
  writeFileSync(out('icon.png'), await renderPng(macTile(256), 256, 256))
  writeFileSync(out('icon-dev.png'), await renderPng(macTile(256, { badge: true }), 256, 256))
  writeFileSync(
    out('tray', 'orca-menu-barTemplate.png'),
    await renderPng(trayMarkup({ width: 22, height: 14 }), 22, 14)
  )
  writeFileSync(
    out('tray', 'orca-menu-barTemplate@2x.png'),
    await renderPng(trayMarkup({ width: 44, height: 28 }), 44, 28)
  )
  console.log(
    '  -> resources/build/icon.png, resources/icon.png, resources/icon-dev.png, resources/tray/*'
  )

  if (process.platform === 'darwin') {
    const iconset = join(mkdtempSync(join(tmpdir(), 'orca-iconset-')), 'icon.iconset')
    mkdirSync(iconset)
    for (const [name, size] of ICONSET_SLOTS) {
      const svg = size <= 64 ? smallSlotTile(size) : macTile(size)
      writeFileSync(join(iconset, name), await renderPng(svg, size, size))
    }
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', out('build', 'icon.icns')])
    rmSync(dirname(iconset), { recursive: true, force: true })
    console.log('  -> resources/build/icon.icns')
  } else {
    console.warn('  !! skipped resources/build/icon.icns (iconutil is macOS-only)')
  }
  // Why: Electron's process.execPath is Electron itself; the ICO builder is plain Node.
  execFileSync(process.execPath, [join(import.meta.dirname, 'trim-windows-icon-source.mjs')], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  })
}

// Why: Electron defers `ready` until this ESM module finishes evaluating, so awaiting
// whenReady() at top level would deadlock; chain instead of awaiting.
const watchdog = setTimeout(() => {
  console.error('render-app-icons: timed out')
  app.exit(1)
}, 120_000)
void app
  .whenReady()
  .then(main)
  .then(
    () => {
      clearTimeout(watchdog)
      app.exit(0)
    },
    (error) => {
      console.error(error)
      app.exit(1)
    }
  )
