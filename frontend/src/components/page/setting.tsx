import { useEffect, useRef, useState } from 'react'
import IconFolderOpen from '@renderer/assets/folder-open.svg'
import IconQuestion from '@renderer/assets/question-circle-fill.svg'
import IconCopy from '@renderer/assets/copy.svg'
import { useForm } from 'react-hook-form'
import Toast, { ToastRefType } from '../message/toast'
import { AllSetting, SettingService, System, type LocalizedText } from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { getSettingAfterPendingSaves, saveAppEnvironment, saveSystemPatch } from '../../services/setting'
import * as runtime from '@wailsio/runtime'
import { EventSystemTheme } from '../../types/type'
import { WailsEvent } from '@wailsio/runtime/types/events'
import { useLanguage, type LanguagePreference } from '../../locales'

type SettingForm = {
  closeWindowHide: boolean
  theme: string
  language: LanguagePreference
  setting: {
    environment: Record<string, Record<string, string>>
  }
}

export default function SettingPage() {
  const form = useForm<SettingForm>()
  const toastRef = useRef<ToastRefType>(null)
  const [config, setConfig] = useState<AllSetting | null>(null)
  const [configError, setConfigError] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const settingText = (value?: LocalizedText) => value?.[language] ?? value?.['zh-CN'] ?? value?.['en-US'] ?? Object.values(value ?? {})[0] ?? ''
  const translateRef = useRef(t)
  translateRef.current = t

  useEffect(() => {
    let active = true
    void getSettingAfterPendingSaves().then(result => {
      if (active) setConfig(result)
    }).catch(error => {
      if (active) {
        setConfigError(true)
        toastRef.current?.error(t('setting.readError', { error: String(error) }))
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!config) return

    let saveTimer: ReturnType<typeof setTimeout> | undefined
    let pendingSystemPatch: Partial<System> = {}
    let pendingEnvironment = new Set<string>()
    let changeVersion = 0

    const flushSave = () => {
      if (saveTimer !== undefined) clearTimeout(saveTimer)
      saveTimer = undefined

      const systemPatch = pendingSystemPatch
      const saveEnvironment = pendingEnvironment
      pendingSystemPatch = {}
      pendingEnvironment = new Set<string>()

      const saves: Promise<void>[] = []
      let environmentResult: Awaited<ReturnType<typeof saveAppEnvironment>> | undefined
      if (Object.keys(systemPatch).length) saves.push(saveSystemPatch(systemPatch))
      if (saveEnvironment.size) {
        const values = form.getValues('setting.environment')
        const apps = Array.from(saveEnvironment).map(appName => ({
          name: appName,
          environment: Object.entries(values?.[appName] ?? {}).map(([key, value]) => `${key}=${value}`),
        }))
        saves.push(saveAppEnvironment(apps).then(result => { environmentResult = result }))
      }
      if (!saves.length) return

      const savedVersion = changeVersion
      void Promise.allSettled(saves).then(async results => {
        const failure = results.find(result => result.status === 'rejected')
        if (failure) toastRef.current?.error(translateRef.current('setting.saveError', { error: String(failure.reason) }))

        if (environmentResult?.failed.length) {
          for (const action of ['prepare', 'start', 'restart'] as const) {
            const names = environmentResult.failed.filter(item => item.action === action && item.logged).map(item => item.name)
            if (!names.length) continue
            const key = action === 'prepare' ? 'setting.processActionFailed' : action === 'start' ? 'setting.startFailed' : 'setting.restartFailed'
            toastRef.current?.error(translateRef.current(key, { names: names.join('、') }))
          }
          const unlogged = environmentResult.failed.filter(item => !item.logged).map(item => item.name)
          if (unlogged.length) toastRef.current?.error(translateRef.current('setting.processLogUnavailable', { names: unlogged.join('、') }))
        }
        if (savedVersion === changeVersion) {
          if (environmentResult?.restarted.length) {
            toastRef.current?.success(translateRef.current('setting.restarted', { names: environmentResult.restarted.join('、') }))
          }
          if (environmentResult?.started.length) {
            toastRef.current?.success(translateRef.current('setting.started', { names: environmentResult.started.join('、') }))
          }
          if (environmentResult?.savedOnly.length) {
            toastRef.current?.success(translateRef.current('setting.savedWithoutStart', { names: environmentResult.savedOnly.join('、') }))
          }
          if (!failure && !environmentResult?.changed) toastRef.current?.success(translateRef.current('setting.saved'))
        }

        if (systemPatch.Theme && results[0]?.status === 'rejected') {
          try {
            const current = await getSettingAfterPendingSaves()
            if (form.getValues('theme') === systemPatch.Theme) {
              void runtime.Events.Emit(EventSystemTheme, current.System.Theme)
            }
          } catch {
            // The save error has already been reported.
          }
        }
        if (systemPatch.Language && results[0]?.status === 'rejected') {
          try {
            const current = await getSettingAfterPendingSaves()
            if (form.getValues('language') === systemPatch.Language) {
              const restored = current.System.Language === 'en-US' || current.System.Language === 'zh-CN' ? current.System.Language : 'auto'
              form.setValue('language', restored)
              setLanguage(restored)
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
      language: config.System.Language === 'en-US' || config.System.Language === 'zh-CN' ? config.System.Language : 'auto',
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
      } else if (name === 'language') {
        const nextLanguage = form.getValues('language')
        setLanguage(nextLanguage)
        pendingSystemPatch.Language = nextLanguage
      } else if (name.startsWith('setting.environment.')) {
        const app = config.Apps?.find(item => name.startsWith(`setting.environment.${item.Name}.`))
        if (!app) return
        pendingEnvironment.add(app.Name)
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
  }, [config, form.getValues, form.reset, form.setValue, form.watch, setLanguage])

  return <div className='flex-1 flex flex-col'>
    <Toast ref={toastRef} />
    <div className='bg-base-300 rounded-box items-center no-animation p-5 m-5 flex'>
      <div className='prose w-60 mr-auto'>
        <h3 className='pl-5'>{t('setting.title')}</h3>
      </div>
      <div className="join gap-0 mr-4 items-center">
        <div className='gap-4 flex'>
          <button className="btn rounded-xl" onClick={async () => {
            await SettingService.OpenWorkDir()
          }}>
            <IconFolderOpen className='w-4' />
            {t('setting.workDirectory')}
          </button>
          <button className="btn rounded-xl" onClick={async () => {
            await SettingService.OpenHomeDir()
          }}>
            <IconFolderOpen className='w-4' />
            {t('setting.dataDirectory')}
          </button>
        </div>
      </div>
    </div>
    <div className='bg-base-300 rounded-box border-base-300 border-solid border-10 m-5 mt-0 flex flex-col overflow-y-auto'>
      <div>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">{t('setting.presetEnvironment')}:</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {([
              ['setting.programDirectory', 'DP_WORK_DIR'],
              ['setting.dataStorageDirectory', 'DP_HOME_DIR'],
            ] as const).map(([label, name]) => {
              const value = configError ? t('setting.loadFailed') : config === null ? t('setting.loading') : config.Preset?.[name] || t('setting.unset')
              const reference = '${' + name + '}'
              return <div key={name} className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-semibold">{t(label)}</span>
                <span className="badge badge-xs badge-neutral">{name}</span>
                <span className={`tooltip ${name === 'DP_WORK_DIR' ? 'tooltip-right' : 'tooltip-bottom'} inline-flex items-center cursor-help fill-warning before:max-w-[min(55vw,28rem)] before:break-all before:whitespace-normal`}
                  role="img" aria-label={`${name}：${value}`} data-tip={value}>
                  <IconQuestion className="w-3.5 h-3.5" />
                </span>
                <button type="button" className="tooltip tooltip-bottom inline-flex items-center cursor-pointer text-base-content"
                  aria-label={t('setting.copy', { value: reference })} data-tip={t('setting.copy', { value: reference })}
                  onClick={() => {
                    void runtime.Clipboard.SetText(reference).then(() => {
                      toastRef.current?.success(t('setting.copied', { value: reference }))
                    }).catch(() => {
                      toastRef.current?.error(t('setting.copyFailed'))
                    })
                  }}>
                  <IconCopy className="w-3.5 h-3.5" />
                </button>
              </div>
            })}
          </div>
        </fieldset>
        {config?.Apps?.map(item => {
          return item.Setting?.Environment && <fieldset key={`fieldset-${item.Name}`} className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
            <legend className="fieldset-legend">{t('setting.environment')} - {item.Name}</legend>
            <fieldset className="fieldset rounded-box flex gap-5">
              {item.Setting?.Environment && Object.entries(item.Setting.Environment).map(([name, value]) => {
                if (!value) return null
                const configured = item.RunOption.Environment?.find(entry => entry.startsWith(`${name}=`))?.slice(name.length + 1) ?? ''
                const displayed = configured.replaceAll('${DP_HOME_DIR}', config.Preset?.DP_HOME_DIR ?? '${DP_HOME_DIR}')
                return <label className="floating-label mb-3 tooltip" data-tip={settingText(value.Description)} key={`label-${item.Name}-${name}`}>
                  <span style={value.Disabled ? { opacity: 1 } : undefined}>{name}</span>
                  {value.Disabled
                    ? <input type="text" value={displayed} placeholder={name} className="input w-xs" disabled
                      style={{ border: '1px solid var(--color-base-300)', backgroundColor: 'var(--color-base-100)', opacity: 1 }} />
                    : <input type="text" {...form.register(`setting.environment.${item.Name}.${name}`)} placeholder={name} className="input w-xs" />}
                </label>
              })}
            </fieldset>
            <p className="label">{t('setting.environmentHelp', { name: item.Name })}</p>
            {Object.entries(item.Setting.Environment).map(([name, value]) => {
              const help = settingText(value?.Help)
              return help && <p className="label" key={`help-${item.Name}-${name}`}>{help}</p>
            })}
          </fieldset>
        })}
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">{t('setting.closeWindowHide')}:</legend>
          <input type="checkbox" className="toggle" {...form.register('closeWindowHide')} />
          <p className="label">{t('setting.closeWindowHideHelp')}</p>
        </fieldset>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4 filter">
          <legend className="fieldset-legend">{t('setting.theme')}:</legend>
          <select {...form.register('theme')} className="select">
            <option value="light">{t('setting.themeLight')}</option>
            <option value="black">{t('setting.themeDark')}</option>
          </select>
          <p className="label">{t('setting.themeHelp')}</p>
        </fieldset>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">{t('setting.language')}:</legend>
          <select {...form.register('language')} className="select">
            <option value="auto">{t('setting.languageAuto')}</option>
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
          <p className="label">{t('setting.languageHelp')}</p>
        </fieldset>
      </div>
    </div>
  </div>
}
