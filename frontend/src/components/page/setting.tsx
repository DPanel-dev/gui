import { useEffect, useRef, useState } from 'react'
import IconFolderOpen from '@renderer/assets/folder-open.svg'
import { useForm } from 'react-hook-form'
import Toast, { ToastRefType } from '../message/toast'
import { AllSetting, SettingService, System } from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { getSettingAfterPendingSaves, saveAppEnvironment, saveSystemPatch } from '../../services/setting'
import * as runtime from '@wailsio/runtime'
import { EventSystemTheme } from '../../types/type'
import { WailsEvent } from '@wailsio/runtime/types/events'

type SettingForm = {
  closeWindowHide: boolean
  theme: string
  setting: {
    environment: Record<string, Record<string, string>>
  }
}

export default function SettingPage() {
  const form = useForm<SettingForm>()
  const toastRef = useRef<ToastRefType>(null)
  const [config, setConfig] = useState<AllSetting | null>(null)

  useEffect(() => {
    let active = true
    void getSettingAfterPendingSaves().then(result => {
      if (active) setConfig(result)
    }).catch(error => {
      if (active) toastRef.current?.error(`读取配置失败：${String(error)}`)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!config) return

    let saveTimer: ReturnType<typeof setTimeout> | undefined
    let pendingSystemPatch: Partial<System> = {}
    let pendingEnvironment = false
    let changeVersion = 0

    const flushSave = () => {
      if (saveTimer !== undefined) clearTimeout(saveTimer)
      saveTimer = undefined

      const systemPatch = pendingSystemPatch
      const saveEnvironment = pendingEnvironment
      pendingSystemPatch = {}
      pendingEnvironment = false

      const saves: Promise<void>[] = []
      if (Object.keys(systemPatch).length) saves.push(saveSystemPatch(systemPatch))
      if (saveEnvironment) {
        const values = form.getValues('setting.environment')
        const apps = Object.entries(values ?? {}).map(([appName, variables]) => ({
          name: appName,
          environment: Object.entries(variables).map(([key, value]) => `${key}=${value}`),
        }))
        saves.push(saveAppEnvironment(apps))
      }
      if (!saves.length) return

      const savedVersion = changeVersion
      void Promise.allSettled(saves).then(async results => {
        const failure = results.find(result => result.status === 'rejected')
        if (!failure) {
          if (savedVersion === changeVersion) toastRef.current?.success('配置已保存')
          return
        }

        toastRef.current?.error(`保存失败：${String(failure.reason)}`)
        if (systemPatch.Theme && results[0].status === 'rejected') {
          try {
            const current = await getSettingAfterPendingSaves()
            if (form.getValues('theme') === systemPatch.Theme) {
              void runtime.Events.Emit(EventSystemTheme, current.System.Theme)
            }
          } catch {
            // The save error has already been reported.
          }
        }
      })
    }

    const scheduleSave = () => {
      changeVersion++
      if (saveTimer !== undefined) clearTimeout(saveTimer)
      saveTimer = setTimeout(flushSave, 600)
    }

    const environment: Record<string, Record<string, string>> = {}
    config.Apps?.forEach(app => {
      environment[app.Name] = {}
      app.RunOption?.Environment?.forEach(item => {
        const pos = item.indexOf('=')
        if (pos >= 0) environment[app.Name][item.slice(0, pos)] = item.slice(pos + 1)
      })
    })
    form.reset({
      closeWindowHide: config.System.CloseWindowHide,
      theme: config.System.Theme,
      setting: { environment },
    })

    const subscription = form.watch((_, { name, type }) => {
      if (type !== 'change' || !name) return

      if (name === 'closeWindowHide') {
        pendingSystemPatch.CloseWindowHide = form.getValues('closeWindowHide')
      } else if (name === 'theme') {
        const theme = form.getValues('theme')
        void runtime.Events.Emit(EventSystemTheme, theme)
        pendingSystemPatch.Theme = theme
      } else if (name.startsWith('setting.environment.')) {
        pendingEnvironment = true
      } else {
        return
      }
      scheduleSave()
    })

    const cancelThemeEvent = runtime.Events.On(EventSystemTheme, (event: WailsEvent) => {
      form.setValue('theme', event.data)
      if (pendingSystemPatch.Theme !== undefined) pendingSystemPatch.Theme = event.data
    })

    return () => {
      subscription.unsubscribe()
      cancelThemeEvent()
      flushSave()
    }
  }, [config, form.getValues, form.reset, form.setValue, form.watch])

  return <div className='flex-1 flex flex-col'>
    <Toast ref={toastRef} />
    <div className='bg-base-300 rounded-box items-center no-animation p-5 m-5 flex'>
      <div className='prose w-60 mr-auto'>
        <h3 className='pl-5'>配置</h3>
      </div>
      <div className="join gap-0 mr-4 items-center">
        <div className='gap-4 flex'>
          <button className="btn rounded-xl" onClick={async () => {
            await SettingService.OpenWorkDir()
          }}>
            <IconFolderOpen className='w-4' />
            程序目录
          </button>
          <button className="btn rounded-xl" onClick={async () => {
            await SettingService.OpenHomeDir()
          }}>
            <IconFolderOpen className='w-4' />
            数据目录
          </button>
        </div>
      </div>
    </div>
    <div className='bg-base-300 rounded-box border-base-300 border-solid border-10 m-5 mt-0 flex flex-col overflow-y-auto'>
      <div>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">预设环境变量: </legend>
          <div className="flex gap-3">
            <h5 className="text-xs font-semibold">
              程序运行目录 <span className="badge badge-xs badge-neutral">DP_WORK_DIR</span>
            </h5>
            <h5 className="text-xs font-semibold">
              数据存储目录 <span className="badge badge-xs badge-neutral">DP_HOME_DIR</span>
            </h5>
          </div>
        </fieldset>
        {config?.Apps?.map(item => {
          return item.Setting?.Environment && <fieldset key={`fieldset-${item.Name}`} className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
            <legend className="fieldset-legend">环境变量 - {item.Name}</legend>
            <fieldset className="fieldset rounded-box flex gap-5">
              {item.Setting?.Environment && Object.entries(item.Setting.Environment).map(([name, value]) => {
                if (!value) return null
                return <label className="floating-label mb-3 tooltip" data-tip={value.Description} key={`label-${item.Name}-${name}`}>
                  <span>{name}</span>
                  <input type="text" {...form.register(`setting.environment.${item.Name}.${name}`)} placeholder={name} className="input w-xs" />
                </label>
              })}
            </fieldset>
            <p className="label">配置 {item.Name} 应用的运行环境变量</p>
          </fieldset>
        })}
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">关闭窗口隐藏到托盘: </legend>
          <input type="checkbox" className="toggle" {...form.register('closeWindowHide')} />
          <p className="label">配置关闭窗口后退出程序还是隐藏至系统托盘</p>
        </fieldset>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4 filter">
          <legend className="fieldset-legend">默认皮肤: </legend>
          <select {...form.register('theme')} className="select">
            <option value="light">Light</option>
            <option value="black">Dark</option>
          </select>
          <p className="label">配置默认皮肤</p>
        </fieldset>
      </div>
    </div>
  </div>
}
