/** Resolves a design token (`--background`) to the rgb() string the theme currently paints. */
export function readCssTokenColor(token: string, fallback = 'rgb(255, 255, 255)'): string {
  if (typeof document === 'undefined') {
    return fallback
  }
  const probe = document.createElement('div')
  probe.style.backgroundColor = `var(${token})`
  probe.style.position = 'absolute'
  probe.style.pointerEvents = 'none'
  probe.style.opacity = '0'
  document.body.appendChild(probe)
  try {
    const color = getComputedStyle(probe).backgroundColor
    return color && color !== 'rgba(0, 0, 0, 0)' ? color : fallback
  } finally {
    probe.remove()
  }
}
