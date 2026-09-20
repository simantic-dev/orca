export type PanDragStart = {
  pointerId: number
  clientX: number
  clientY: number
  scrollLeft: number
  scrollTop: number
}

/** Scroll offsets that keep the grabbed point under the pointer. */
export function panScrollFromDrag(
  start: PanDragStart,
  clientX: number,
  clientY: number
): { scrollLeft: number; scrollTop: number } {
  return {
    scrollLeft: start.scrollLeft - (clientX - start.clientX),
    scrollTop: start.scrollTop - (clientY - start.clientY)
  }
}
