import { useEffect, useRef, useState } from 'react'
import IconSave from '@renderer/assets/save.svg'
import IconFolderOpen from '@renderer/assets/folder-open.svg'
import { useForm } from 'react-hook-form'
import Toast, { ToastRefType } from '../message/toast'
import {
    AllSetting,
    App,
    EnvironmentItem,
    SettingService
} from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import * as runtime from '@wailsio/runtime'
import { EventSystemTheme } from '../../types/type'

export interface ConfigResult {
  env: {
    APP_SERVER_PORT: number
  },
  theme: string,
  autoLaunch: boolean,
  closeWindowHide: boolean,
  autoOpenAppServerUrl: boolean,
}

export default function SettingPage() {
  const form = useForm<{
    autoLaunch: boolean
    closeWindowHide: boolean
    theme: string,
    setting: {
      environment: Record<string, Record<string, string>>
    }
  }>({})
  const [reload, setReload] = useState(0)
  const toastRef = useRef<ToastRefType>(null)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<AllSetting | null>()

  useEffect(() => {
    // setConfig({
    //   "System": {
    //     "AutoLaunch": false,
    //     "CloseWindowHide": true,
    //     "Theme": "light"
    //   },
    //   "Apps": [
    //     {
    //       "Name": "dpanel",
    //       "HomeUrl": "http://${HOME_URL}:${APP_SERVER_PORT}",
    //       "RunOption": {
    //         "AutoLaunch": true,
    //         "WorkDir": "./",
    //         "StartCommand": "./dpanel server:start",
    //         "StopCommand": "",
    //         "Environment": [
    //           "APP_SERVER_PORT=8086",
    //           "STORAGE_LOCAL_PATH=${DP_WORK_DIR}/data",
    //           "HOME_URL=http://127.0.0.1"
    //         ],
    //         "LogMaxLine": 1000
    //       },
    //       "Setting": {
    //         "Environment": {
    //           "APP_SERVER_PORT": {
    //             "Description": "服务运行端口"
    //           },
    //           "HOME_URL": {
    //             "Description": "访问地址"
    //           },
    //           "STORAGE_LOCAL_PATH": {
    //             "Description": "数据存储目录"
    //           }
    //         }
    //       }
    //     },
    //     {
    //       "Name": "nginx",
    //       "HomeUrl": "http://${HOME_URL}:${APP_SERVER_PORT}",
    //       "RunOption": {
    //         "AutoLaunch": false,
    //         "WorkDir": "./",
    //         "StartCommand": "./dpanel server:start",
    //         "StopCommand": "",
    //         "Environment": [
    //           "APP_SERVER_PORT=8086",
    //         ],
    //         "LogMaxLine": 1000
    //       },
    //       "Setting": {
    //         "Environment": {
    //           "APP_SERVER_PORT": {
    //             "Description": "服务运行端口"
    //           },
    //         }
    //       }
    //     }
    //   ]
    // })

    SettingService.GetAll().then((res: AllSetting) => {
      res && setConfig(res)
    })
  }, [reload])

  useEffect(() => {
    if (config) {
      config.Apps?.forEach((app: App) => {
        app.RunOption?.Environment?.forEach((item: string) => {
          const pos = item.indexOf("=")
          form.setValue(`setting.environment.${app.Name}.${item.slice(0, pos)}`, item.slice(pos + 1))
        });
      })
      form.setValue("autoLaunch", config.System.AutoLaunch)
      form.setValue("closeWindowHide", config.System.CloseWindowHide)
      form.setValue("theme", config.System.Theme)

      SettingService.GetAutoLaunchStatus().then(res => {
        if (res && res.Data != "") {
          form.setValue("autoLaunch", true)
        } else {
          form.setValue("autoLaunch", false)
        }
      })
    }
  }, [config])


  return <div className='flex-1 flex flex-col'>
    <Toast ref={toastRef} />
    <div className='bg-base-300 rounded-box items-center no-animation p-5 m-5 flex'>
      <div className='prose w-60 mr-auto'>
        <h3 className='pl-5'>
          配置
        </h3>
      </div>
      <div className="join gap-0 mr-4  items-center">
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
          <button className="btn rounded-xl btn-primary text-primary-content fill-primary-content" type="submit"
            form="setting-form">
            {loading ? <span className="loading loading-spinner loading-xs"></span> : <IconSave className='w-4' />}
            保存
          </button>
        </div>
      </div>
    </div>
    <div className='bg-base-300 rounded-box border-base-300 border-solid border-10 m-5 mt-0 flex flex-col overflow-y-auto'>
      <form id="setting-form" onSubmit={form.handleSubmit(async (formData) => {
        if (loading) {
          return
        }
        setLoading(true)

        try {
          await SettingService.SaveAppEnvironment(formData.setting.environment && Object.entries(formData.setting.environment).map(([name, item]) => {
            return {
              name: name,
              environment: Object.entries(item).map(([name, value]) => {
                return `${name}=${value}`
              })
            }
          }))

          if (formData.theme) {
            runtime.Events.Emit(EventSystemTheme, {
              name: EventSystemTheme,
              data: formData.theme
            })
          }

          await SettingService.SaveSystem({
            AutoLaunch: formData.autoLaunch,
            CloseWindowHide: formData.closeWindowHide,
            Theme: formData.theme,
          })

          SettingService.SaveAutoLaunchStatus(formData.autoLaunch)

        } catch (e) {
          setLoading(false)
        } finally {
          setLoading(false)
        }

        setReload(reload + 1)
      })}>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">预设环境变量: </legend>
          <div className=" flex gap-3">
            <h5 className="text-xs font-semibold">
              程序运行目录 <span className="badge badge-xs badge-neutral">DP_WORK_DIR</span>
            </h5>
            <h5 className="text-xs font-semibold">
              数据存储目录 <span className="badge badge-xs badge-neutral">DP_HOME_DIR</span>
            </h5>
          </div>
        </fieldset>
        {config?.Apps?.map((item, index) => {
          return item.Setting?.Environment && <fieldset key={`fieldset-${item.Name}`} className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
            <legend className="fieldset-legend">环境变量 - {item.Name}</legend>
            <fieldset className="fieldset rounded-box flex gap-5">
              {item.Setting?.Environment && Object.entries(item.Setting.Environment).map(([name, value]: [string, EnvironmentItem]) => {
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
          <legend className="fieldset-legend">开机自动启动: </legend>
          <input type="checkbox" className="toggle" {...form.register("autoLaunch")} />
          <p className="label">配置是否开机自动运行，仅支持 Windows 系统，需以 “管理员身份运行” 程序</p>
        </fieldset>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">关闭窗口隐藏到托盘: </legend>
          <input type="checkbox" className="toggle" {...form.register("closeWindowHide")} />
          <p className="label">配置关闭窗口后退出程序还是隐藏至系统托盘</p>
        </fieldset>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4 filter">
          <legend className="fieldset-legend">默认皮肤: </legend>
          <select {...form.register("theme")} className="select">
            <option value={"light"}>Light</option>
            <option value={"black"}>Dark</option>
          </select>
          <p className="label">配置默认皮肤</p>
        </fieldset>
      </form>
    </div>
  </div>
}
