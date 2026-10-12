import { AllSetting, SettingService, System } from '../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { ProcessService } from '../../bindings/github.com/donknap/dpanel-gui/services/process'

export type EnvironmentSaveResult = {
  changed: boolean
  restarted: string[]
  started: string[]
  savedOnly: string[]
  failed: { name: string, action: 'start' | 'restart' | 'prepare', logged: boolean }[]
}

let saveQueue = Promise.resolve()

function enqueueSave<T>(saveSetting: () => Promise<T>): Promise<T> {
  const save = saveQueue.then(saveSetting)
  saveQueue = save.then(() => undefined, () => undefined)
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

export function saveAppEnvironment(apps: { name: string, environment: string[] }[]): Promise<EnvironmentSaveResult> {
  return enqueueSave(async () => {
    const current = await SettingService.GetAll()
    const changedApps = apps.filter(({ name, environment }) => {
      const app = current.Apps?.find(item => item.Name === name)
      const previous = app?.RunOption.Environment ?? []
      return app && (previous.length !== environment.length || previous.some((value, index) => value !== environment[index]))
    })
    const outcome: EnvironmentSaveResult = { changed: changedApps.length > 0, restarted: [], started: [], savedOnly: [], failed: [] }
    if (!outcome.changed) return outcome

    const result = await SettingService.SaveAppEnvironment(apps)
    if (result?.Error) throw new Error(result.Error)

    for (const { name } of changedApps) {
      let wasRunning: boolean | undefined
      let phase = 'read app configuration'
      try {
        const app = await SettingService.GetApp(name)
        if (!app) throw new Error('app configuration not found')
        phase = 'read process status'
        const status = await ProcessService.GetProcessStatus(name)
        wasRunning = status.Status.startsWith('running')
        if (!wasRunning && !app.RunOption.AutoLaunch) {
          outcome.savedOnly.push(name)
          continue
        }
        if (wasRunning) {
          phase = 'stop process'
          await ProcessService.Stop(name)
        }
        phase = 'start process'
        if (await ProcessService.Run(name, app.RunOption)) {
          if (wasRunning) outcome.restarted.push(name)
          else outcome.started.push(name)
        } else {
          // Run(false) has already stored the underlying error in the process log.
          outcome.failed.push({ name, action: wasRunning ? 'restart' : 'start', logged: true })
        }
      } catch (error) {
        const secrets = [...(current.Apps ?? []).flatMap(app => app.RunOption.Environment ?? []), ...apps.flatMap(app => app.environment)]
          .map(entry => entry.slice(entry.indexOf('=') + 1))
          .filter(value => value.length > 0)
          .sort((left, right) => right.length - left.length)
        const reason = secrets.reduce((message, value) => message.replaceAll(value, '[redacted]'), String(error))
        let logged = false
        try {
          await ProcessService.ReportOperationError(name, phase, reason)
          logged = true
        } catch {
          // The process bridge may be unavailable; do not tell the user to check an absent log.
        }
        outcome.failed.push({ name, action: wasRunning === undefined ? 'prepare' : wasRunning ? 'restart' : 'start', logged })
      }
    }
    return outcome
  })
}
