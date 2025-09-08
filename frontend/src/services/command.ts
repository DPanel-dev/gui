import * as runtime from '@wailsio/runtime'
import { ProcessEventMessage, ProcessService } from "../../bindings/github.com/donknap/dpanel-gui/services/process";
import { SettingService } from "../../bindings/github.com/donknap/dpanel-gui/services/setting";

export async function runCommand(name: string): Promise<boolean> {
  try {
    const config = await SettingService.GetApp(name)
    if (!config || config.RunParams.Name == "" || config.RunParams.CommandName == "") {
      await runtime.Events.Emit({
        name: await ProcessService.GetEventName(name),
        data: {
          Log: "App was not found or was incompletely configured.",
          Status: "error"
        } as ProcessEventMessage
      })
      return false
    }
    console.log(config);

    const status = await ProcessService.Run(config.RunParams, config.RunOption)
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