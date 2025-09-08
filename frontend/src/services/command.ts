import * as kvstore from '../../bindings/github.com/wailsapp/wails/v3/pkg/services/kvstore'
import * as runtime from '@wailsio/runtime'
import * as process from '../../bindings/github.com/donknap/dpanel-gui/services/process'


export interface Command {
  id: string,
  name: string
  args: string[]
  env?: string[]
}

export interface ProcessMessageResult {
  log: string,
  status: string,
}

export const PROCESS_EVENT_MESSAGE_PREFIX = 'dp-process'

export async function runCommand(id: string): Promise<boolean> {
  try {
    // 首先获取配置，如果没有配置则先初始化配置信息
    const config = await kvstore.KVStoreService.Get(id)
    const status = await process.ProcessService.Run(id, config.command, ...config.args)
    if (!status) {
      return false
    }
  } catch (e) {
    runtime.Events.Emit({
      name: getProcessEventName(id),
      data: {
        log: String(e),
        status: "error"
      } as ProcessMessageResult
    })
    return false
  }
  return true
}

export function getProcessEventName(name: string) {
  return `${PROCESS_EVENT_MESSAGE_PREFIX}-${name}`
}