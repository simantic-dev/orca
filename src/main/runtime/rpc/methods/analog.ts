import { defineMethod, defineStreamingMethod } from '../core'
import {
  AnalogListRunsParams,
  AnalogReadDatasetParams,
  AnalogRunParams,
  AnalogToolchainParams,
  AnalogUnwatchParams,
  AnalogWatchParams,
  AnalogWorktreeParams
} from '../../../../shared/rpc-contract/analog-params'

let analogWatchSubscriptionSeq = 0

export const ANALOG_METHODS = [
  defineMethod({
    name: 'analog.toolchain',
    params: AnalogToolchainParams,
    handler: async (params, { runtime }) => runtime.analogToolchain(params)
  }),
  defineMethod({
    name: 'analog.listRuns',
    params: AnalogListRunsParams,
    handler: async (params, { runtime }) => runtime.analogListRuns(params)
  }),
  defineMethod({
    name: 'analog.getRun',
    params: AnalogRunParams,
    handler: async (params, { runtime }) => runtime.analogGetRun(params)
  }),
  defineMethod({
    name: 'analog.readDataset',
    params: AnalogReadDatasetParams,
    handler: async (params, { runtime }) => runtime.analogReadDataset(params)
  }),
  defineMethod({
    name: 'analog.listSessionCalls',
    params: AnalogWorktreeParams,
    handler: async (params, { runtime }) => runtime.analogListSessionCalls(params)
  }),
  defineMethod({
    name: 'analog.forgetRun',
    params: AnalogRunParams,
    handler: async (params, { runtime }) => runtime.analogForgetRun(params)
  }),
  defineStreamingMethod({
    name: 'analog.watch',
    params: AnalogWatchParams,
    handler: async (params, { runtime, connectionId }, emit) => {
      const controller = new AbortController()
      const seq = ++analogWatchSubscriptionSeq
      const subscriptionId = `analog-watch-${connectionId ?? 'inproc'}-${seq}`
      runtime.registerSubscriptionCleanup(subscriptionId, () => controller.abort(), connectionId)
      try {
        await runtime.analogWatch(params, controller.signal, emit)
      } finally {
        runtime.cleanupSubscription(subscriptionId)
        emit({ type: 'end' })
      }
    }
  }),
  defineMethod({
    name: 'analog.unwatch',
    params: AnalogUnwatchParams,
    handler: async (params, { runtime, connectionId }) => {
      const expectedPrefix = `analog-watch-${connectionId ?? 'inproc'}-`
      if (!params.subscriptionId.startsWith(expectedPrefix)) {
        return { unsubscribed: false }
      }
      runtime.cleanupSubscription(params.subscriptionId)
      return { unsubscribed: true }
    }
  })
] as const
