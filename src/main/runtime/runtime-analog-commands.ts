import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import type { GlobalSettings } from '../../shared/global-settings-types'
import type {
  AnalogCliAvailability,
  AnalogDatasetSeries,
  AnalogRunManifest,
  AnalogRunsListing,
  AnalogSessionCall,
  AnalogToolchainInfo,
  AnalogWatchEvent
} from '../../shared/analog-cli-types'
import { runProcess } from '../../shared/child-process/run-process'
import { discoverAnalogCli } from '../analog-cli/analog-cli-discovery'
import { analogCliSessionLogPath } from '../analog-cli/analog-cli-session-env'
import { readAnalogDataset } from '../analog-cli/analog-dataset-reader'
import { resolveAnalogHistoryRoot } from '../analog-cli/analog-history-root'
import { listAnalogRuns, readAnalogRun } from '../analog-cli/analog-history-store'
import { readAnalogSessionLog } from '../analog-cli/analog-session-log'
import { watchAnalogStore } from '../analog-cli/analog-store-watcher'
import { requireLocalExecutionHost } from '../hardware-tools/local-execution-host-gate'
import type { ResolvedRuntimeFileTarget } from './runtime-file-command-target'

export type RuntimeAnalogCommandHost = {
  getSettings(): Pick<GlobalSettings, 'analogCliPath'>
  resolveRuntimeFileTarget(selector: string): Promise<ResolvedRuntimeFileTarget>
  getUserDataPath(): string
  /** The login-shell environment, so PATH matches what the user's terminal sees. */
  getProcessEnv(): Promise<NodeJS.ProcessEnv>
}

const AVAILABILITY_TTL_MS = 60_000
const REMOTE_UNSUPPORTED = 'analog_remote_unsupported'
const FORGET_TIMEOUT_MS = 15_000

type CachedAvailability = { key: string; at: number; value: Promise<AnalogCliAvailability> }

function listDirectoryNames(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

export class RuntimeAnalogCommands {
  private availability: CachedAvailability | null = null

  constructor(private readonly host: RuntimeAnalogCommandHost) {}

  async analogToolchain(
    params: { worktree?: string; refresh?: boolean } = {}
  ): Promise<AnalogToolchainInfo> {
    if (params.worktree) {
      await this.resolveLocalTarget(params.worktree)
    }
    return {
      cli: await this.resolveAvailability(params.refresh === true),
      historyRoot: await this.historyRoot()
    }
  }

  async analogListRuns(params: {
    worktree: string
    scope: 'workspace' | 'all'
    limit: number
  }): Promise<AnalogRunsListing> {
    const target = await this.resolveLocalTarget(params.worktree)
    return listAnalogRuns(await this.historyRoot(), {
      limit: params.limit,
      scopePath: params.scope === 'workspace' ? target.worktree.path : null
    })
  }

  async analogGetRun(params: { worktree: string; historyId: string }): Promise<AnalogRunManifest> {
    await this.resolveLocalTarget(params.worktree)
    return readAnalogRun(await this.historyRoot(), params.historyId)
  }

  async analogReadDataset(params: {
    worktree: string
    historyId: string
    file: string
    columns?: string[]
    buckets: number
  }): Promise<AnalogDatasetSeries> {
    await this.resolveLocalTarget(params.worktree)
    const run = await readAnalogRun(await this.historyRoot(), params.historyId)
    const dataset = run.datasets.find((candidate) => candidate.file === params.file)
    if (!dataset) {
      throw new Error('analog_dataset_not_found')
    }
    return readAnalogDataset(dataset.path, { columns: params.columns, buckets: params.buckets })
  }

  async analogListSessionCalls(params: {
    worktree: string
  }): Promise<{ calls: AnalogSessionCall[] }> {
    const target = await this.resolveLocalTarget(params.worktree)
    return { calls: await readAnalogSessionLog(this.sessionLogPath(target)) }
  }

  async analogForgetRun(params: { worktree: string; historyId: string }): Promise<{ ok: true }> {
    await this.resolveLocalTarget(params.worktree)
    const availability = await this.resolveAvailability(false)
    if (availability.status !== 'found') {
      throw new Error('analog_cli_not_found')
    }
    const result = await runProcess({
      program: availability.binaryPath,
      args: ['history', 'forget', params.historyId],
      timeoutMs: FORGET_TIMEOUT_MS,
      maxOutputBytes: 64 * 1024
    })
    if (result.code !== 0) {
      throw new Error(
        result.stderr.trim() || `analog-cli history forget exited with ${result.code}`
      )
    }
    return { ok: true }
  }

  /** Streams change notices until `signal` aborts; the caller re-lists on each one. */
  async analogWatch(
    params: { worktree: string },
    signal: AbortSignal,
    emit: (event: AnalogWatchEvent) => void
  ): Promise<void> {
    const target = await this.resolveLocalTarget(params.worktree)
    emit({ type: 'ready' })
    await watchAnalogStore({
      historyRoot: await this.historyRoot(),
      sessionLogPath: this.sessionLogPath(target),
      signal,
      onChange: (kind) => emit({ type: 'changed', kind })
    })
  }

  private sessionLogPath(target: ResolvedRuntimeFileTarget): string {
    return analogCliSessionLogPath(this.host.getUserDataPath(), target.worktree.id)
  }

  private async historyRoot(): Promise<string> {
    return resolveAnalogHistoryRoot(await this.host.getProcessEnv(), homedir())
  }

  private async resolveLocalTarget(worktree: string): Promise<ResolvedRuntimeFileTarget> {
    const target = await this.host.resolveRuntimeFileTarget(worktree)
    requireLocalExecutionHost(target, REMOTE_UNSUPPORTED)
    return target
  }

  protected resolveAvailability(refresh: boolean): Promise<AnalogCliAvailability> {
    const configuredPath = this.host.getSettings().analogCliPath ?? null
    const key = configuredPath ?? ''
    const cached = this.availability
    if (!refresh && cached && cached.key === key && Date.now() - cached.at < AVAILABILITY_TTL_MS) {
      return cached.value
    }
    const value = this.host.getProcessEnv().then((env) =>
      discoverAnalogCli({
        configuredPath,
        env,
        platform: process.platform,
        homeDir: homedir(),
        exists: existsSync,
        listDirectory: listDirectoryNames,
        run: runProcess
      })
    )
    this.availability = { key, at: Date.now(), value }
    return value
  }
}
