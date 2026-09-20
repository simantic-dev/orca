import { posix, win32 } from 'node:path'

export type ExecutableLookupHost = {
  env: NodeJS.ProcessEnv
  platform: NodeJS.Platform
  exists: (path: string) => boolean
}

/** First `PATH` entry holding `name` (`name.exe` on Windows), or null. */
export function findExecutableOnPath(name: string, host: ExecutableLookupHost): string | null {
  // Why: the lookup is unit-tested for both platforms from one host, so the path flavour follows
  // the platform under test rather than the process running the test.
  const pathApi = host.platform === 'win32' ? win32 : posix
  const pathValue = host.env.PATH ?? host.env.Path ?? ''
  const fileName = host.platform === 'win32' ? `${name}.exe` : name
  for (const dir of pathValue.split(pathApi.delimiter)) {
    if (!dir) {
      continue
    }
    const candidate = pathApi.join(dir, fileName)
    if (host.exists(candidate)) {
      return candidate
    }
  }
  return null
}
