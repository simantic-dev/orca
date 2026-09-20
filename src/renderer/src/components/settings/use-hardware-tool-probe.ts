import { useCallback, useEffect, useRef, useState } from 'react'

export type HardwareToolProbe<T> = {
  value: T | null
  error: string | null
  loading: boolean
  refresh: () => Promise<void>
}

/** Loads a toolchain probe on mount and whenever `configuredPath` changes; `refresh` bypasses the host cache. */
export function useHardwareToolProbe<T>(
  load: (refresh: boolean) => Promise<T>,
  configuredPath: string | null
): HardwareToolProbe<T> {
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const generation = useRef(0)

  const run = useCallback(
    async (refresh: boolean): Promise<void> => {
      const token = ++generation.current
      setLoading(true)
      try {
        const next = await load(refresh)
        if (token === generation.current) {
          setValue(next)
          setError(null)
        }
      } catch (caught) {
        if (token === generation.current) {
          setError(caught instanceof Error ? caught.message : String(caught))
        }
      } finally {
        if (token === generation.current) {
          setLoading(false)
        }
      }
    },
    [load]
  )

  useEffect(() => {
    void run(true)
  }, [run, configuredPath])

  const refresh = useCallback(() => run(true), [run])
  return { value, error, loading, refresh }
}
