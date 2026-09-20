import {
  runtimeFileRouteForTarget,
  type ResolvedRuntimeFileTarget
} from '../runtime/runtime-file-command-target'

/**
 * v1 of the hardware tooling runs kicad-cli/analog-cli and reads their artifacts on the local host
 * only. A remote workspace must refuse by name rather than answer from the wrong machine
 * (docs/reference/ssh-execution-boundary.md); the `runtime:` route already throws.
 */
export function requireLocalExecutionHost(
  target: Pick<ResolvedRuntimeFileTarget, 'executionHostId'>,
  remoteUnsupportedCode: string
): void {
  if (runtimeFileRouteForTarget(target).kind !== 'local') {
    throw new Error(remoteUnsupportedCode)
  }
}
