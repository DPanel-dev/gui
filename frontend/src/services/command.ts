import * as runtime from '@wailsio/runtime'
import * as process from '../../bindings/github.com/donknap/dpanel-gui/services/process'
import { SettingService } from '../../bindings/github.com/donknap/dpanel-gui/services/setting'

export async function runCommand(name: string): Promise<boolean> {
  try {
    const config = await SettingService.GetApp(name)
    if (!config || config.Name == "" || config.CommandName == "") {
      throw new Error("App was not found or was incompletely configured.")
    }
    console.log({
      Name: config.Name,
      CommandName: config.CommandName,
      Args: config.Args,
      Environment: config.Environment ? config.Environment.map(item => {
        return `${item.Name}=${item.Value}`
      }) : null,
      WorkDir: ""
    });

    const status = await process.ProcessService.Run({
      Name: config.Name,
      CommandName: config.CommandName,
      Args: config.Args,
      Environment: config.Environment ? config.Environment.map(item => {
        return `${item.Name}=${item.Value}`
      }) : null,
      WorkDir: ""
    })
    if (!status) {
      return false
    }
  } catch (e) {
    runtime.Events.Emit({
      name: await process.ProcessService.GetEventName(name),
      data: {
        Log: String(e),
        Status: "error"
      } as process.ProcessEventMessage
    })
    return false
  }
  return true
}