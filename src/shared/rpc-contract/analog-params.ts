import { z } from 'zod'
import {
  ANALOG_DATASET_DEFAULT_BUCKETS,
  ANALOG_DATASET_MAX_BUCKETS,
  ANALOG_DATASET_MAX_COLUMNS,
  ANALOG_RUNS_MAX_LIMIT
} from '../analog-cli-types'

export const AnalogToolchainParams = z.object({
  worktree: z.string().optional(),
  /** Bypass the cached probe (the settings pane's refresh button). */
  refresh: z.boolean().optional()
})

export const AnalogWorktreeParams = z.object({ worktree: z.string().min(1) })

export const AnalogListRunsParams = AnalogWorktreeParams.extend({
  /** `workspace` keeps runs about this workspace (or run from it); `all` lists the whole store. */
  scope: z.enum(['workspace', 'all']).default('workspace'),
  limit: z.number().int().min(1).max(ANALOG_RUNS_MAX_LIMIT).default(50)
})

const ANALOG_RUN_ID = z.string().regex(/^\d{8}-\d{6}-\d{3}-\d+$/)

export const AnalogRunParams = AnalogWorktreeParams.extend({ historyId: ANALOG_RUN_ID })

export const AnalogReadDatasetParams = AnalogRunParams.extend({
  file: z.string().regex(/^\d{2}-[A-Za-z0-9._-]+\.csv$/),
  columns: z.array(z.string().min(1)).max(ANALOG_DATASET_MAX_COLUMNS).optional(),
  /** Downsampling buckets; every series keeps its per-bucket extremes. */
  buckets: z
    .number()
    .int()
    .min(50)
    .max(ANALOG_DATASET_MAX_BUCKETS)
    .default(ANALOG_DATASET_DEFAULT_BUCKETS)
})

export const AnalogWatchParams = AnalogWorktreeParams

export const AnalogUnwatchParams = z.object({ subscriptionId: z.string().min(1) })
