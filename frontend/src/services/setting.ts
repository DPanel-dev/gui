import { AllSetting, SettingService, System } from '../../bindings/github.com/donknap/dpanel-gui/services/setting'

let saveQueue = Promise.resolve()

function enqueueSave(saveSetting: () => Promise<void>): Promise<void> {
  const save = saveQueue.then(saveSetting)
  saveQueue = save.catch(() => {})
  return save
}

export function getSettingAfterPendingSaves(): Promise<AllSetting> {
  return saveQueue.then(() => SettingService.GetAll())
}

export function saveSystemPatch(patch: Partial<System>): Promise<void> {
  return enqueueSave(async () => {
    const current = await SettingService.GetAll()
    const result = await SettingService.SaveSystem({ ...current.System, ...patch })
    if (result?.Error) throw new Error(result.Error)
  })
}

export function saveAppEnvironment(apps: { name: string, environment: string[] }[]): Promise<void> {
  return enqueueSave(async () => {
    const result = await SettingService.SaveAppEnvironment(apps)
    if (result?.Error) throw new Error(result.Error)
  })
}
