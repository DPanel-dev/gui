import { useEffect, useRef, useState } from 'react'
import IconSave from '@renderer/assets/save.svg'
import IconFolderOpen from '@renderer/assets/folder-open.svg'
import { useForm } from 'react-hook-form'
import Toast, { ToastRefType } from '../message/toast'
import {
    AllConfig,
    App,
    EnvironmentLabelItem,
    SettingService
} from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'

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
  const form = useForm({})
  const [reload, setReload] = useState(0)
  const toastRef = useRef<ToastRefType>(null)
  const [loading, setLoading] = useState(false)
  const [appList, setAppList] = useState<App[] | null>()

  useEffect(() => {
    // window.api && window.api.runConfigLoad().then((res) => {
    //   const config = JSON.parse(res) as ConfigResult
    //   if (config) {
    //     form.setValue("env[APP_SERVER_PORT]", config?.env.APP_SERVER_PORT)
    //     form.setValue("autoLaunch", config?.autoLaunch)
    //     form.setValue("closeWindowHide", config?.closeWindowHide)
    //     form.setValue("autoOpenAppServerUrl", config?.autoOpenAppServerUrl)
    //     form.setValue("theme", config?.theme)
    //   }
    //   setTimeout(() => {
    //     setLoading(false)
    //   }, 1000);
    // })
    // setAppList([
    //   {
    //     "Name": "dpanel",
    //     "RunOption": {
    //       "AutoLaunch": true,
    //       "WorkDir": "./",
    //       "StartCommand": "./dpanel server:start",
    //       "StopCommand": "",
    //       "Environment": [
    //         "APP_SERVER_PORT=8086",
    //         "STORAGE_LOCAL_PATH=${DP_WORK_DIR}/data"
    //       ],
    //       "LogMaxLine": 1000
    //     },
    //     "Setting": {
    //       "HomeUrl": "http://127.0.0.1:${APP_SERVER_PORT}",
    //       "Environment": {
    //         "APP_SERVER_PORT": {
    //           "ZhCN": "服务运行端口",
    //           "EnUS": "Service running port"
    //         },
    //         "STORAGE_LOCAL_PATH": {
    //           "ZhCN": "数据存储目录",
    //           "EnUS": "Data storage directory"
    //         }
    //       }
    //     }
    //   }
    // ])
    SettingService.GetAll().then((res:AllConfig) => {
      if (res) {
        res.Apps?.forEach((app:App) => {
          app.RunOption.Environment?.forEach((item:string) => {
            const pos = item.indexOf("=")
            form.setValue(`environment[${app.Name}][${item.slice(0, pos)}]`, item.slice(pos + 1))
          });
        })
        form.setValue("autoLaunch", res.System.AutoLaunch)
        form.setValue("closeWindowHide", res.System.CloseWindowHide)
        form.setValue("theme", res.System.Theme)
      }
      setAppList(res.Apps)
    })
  }, [reload])


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
          <button className="btn rounded-xl">
            <IconFolderOpen className='w-4' />
            程序目录
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
      <form id="setting-form" onSubmit={form.handleSubmit(async (data) => {
        if (loading) {
          return
        }
        console.log(data);

        //setLoading(true)
        setReload(reload + 1)
      })}>
          <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
              <legend className="fieldset-legend">预设环境变量: </legend>
              <div className=" flex gap-3">
                  <h5 className="text-xs font-semibold">
                      当前程序根目录 <span className="badge badge-xs badge-neutral">DP_WORK_DIR</span>
                  </h5>
              </div>
          </fieldset>
        {appList?.map((item, index) => {
          return <fieldset key={`fieldset-${item.Name}`} className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
            <legend className="fieldset-legend">环境变量 - {item.Name}</legend>
            <fieldset className="fieldset rounded-box flex gap-5">
              {item.Setting.Environment && Object.entries(item.Setting.Environment).map(([name, value]:[string, EnvironmentLabelItem]) => {
                return <label className="floating-label mb-3" key={`label-${item.Name}-${name}`}>
                  <span>{name}</span>
                  <input type="text" {...form.register(`environment[${item.Name}][${name}]`)} placeholder={value.ZhCN} className="input w-xs" />
                </label>
              })}
            </fieldset>
            <p className="label">配置 {item.Name} 应用的运行环境变量</p>
          </fieldset>
        })}
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">开机自动启动: </legend>
          <input type="checkbox" className="toggle" {...form.register("autoLaunch")} />
          <p className="label">配置是否开机自动运行</p>
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
