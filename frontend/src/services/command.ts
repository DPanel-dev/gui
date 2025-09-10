import * as runtime from '@wailsio/runtime'
import { ProcessEventMessage, ProcessService, RunOption } from "../../bindings/github.com/donknap/dpanel-gui/services/process";
import { EventProcess } from '../types/type';

export async function runCommand(name: string, runOption: RunOption): Promise<boolean> {
  try {
    const status = await ProcessService.Run(name, runOption)
    if (!status) {
      return false
    }
  } catch (e) {
    await runtime.Events.Emit({
      name: await ProcessService.GetEventName(name),
      data: {
        Log: String(e),
        Status: "error"
      } as ProcessEventMessage
    })
    return false
  }
  return true
}

export async function stopCommand(name: string) {
  await ProcessService.Stop(name)
}

export function getEventName(name: string): string {
  return `${EventProcess}-${name}`
}