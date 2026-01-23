import { ProcessService, RunOption } from "../../bindings/github.com/donknap/dpanel-gui/services/process";
import { EventProcess } from '../types/type';

export async function runCommand(name: string, runOption: RunOption): Promise<boolean> {
  try {
    const status = await ProcessService.Run(name, runOption)
    if (!status) {
      return false
    }
  } catch (e) {
    await ProcessService.EventEmit(getEventName(name), {
      Log: String(e),
      Status: "error"
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