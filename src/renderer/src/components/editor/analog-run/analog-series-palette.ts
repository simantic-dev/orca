// CROSS-RENDERER CONTRACT: analog-cli's HTML report (src/visualization/mod.rs) and analog-gui draw
// the same signals with these hues, in this order, with this dash cycle; changing one side alone is a bug.
export const ANALOG_SERIES_LIGHT = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948'
] as const

export const ANALOG_SERIES_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767'
] as const

export const ANALOG_SERIES_DASHES: readonly (readonly number[])[] = [[], [6, 3], [1, 3]]

export const ANALOG_MAX_PLOTTED_SERIES = ANALOG_SERIES_LIGHT.length * ANALOG_SERIES_DASHES.length

export function analogSeriesStyle(
  index: number,
  isDark: boolean
): { stroke: string; dash: number[] } {
  const hues = isDark ? ANALOG_SERIES_DARK : ANALOG_SERIES_LIGHT
  const hue = hues[index % hues.length] ?? hues[0]
  const dash =
    ANALOG_SERIES_DASHES[Math.floor(index / hues.length) % ANALOG_SERIES_DASHES.length] ?? []
  return { stroke: hue, dash: [...dash] }
}
