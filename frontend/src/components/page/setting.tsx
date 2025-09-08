import { useEffect, useRef, useState } from 'react'
import IconSave from '@renderer/assets/save.svg'
import IconFolderOpen from '@renderer/assets/folder-open.svg'
import { useForm } from 'react-hook-form'
import Toast, { ToastRefType } from '../message/toast'

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
      <form id="setting-form" onSubmit={form.handleSubmit(async (data) => {
        if (loading) {
          return
        }
        setLoading(true)
        // window.api && await window.api.runConfigSave(data)
        setReload(reload + 1)
      })}>
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">运行端口: </legend>
          <input type="number" className="input" {...form.register("env[APP_SERVER_PORT]")} />
          <p className="label">配置后台服务运行端口, 端口被占用时无法启动。为空时使用随机空闲端口</p>
        </fieldset>
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
        <fieldset className="fieldset bg-base-100/60 border-base-300 rounded-box border p-4">
          <legend className="fieldset-legend">自动访问主界面: </legend>
          <input type="checkbox" className="toggle" {...form.register("autoOpenAppServerUrl")} />
          <p className="label">配置服务启动后是否自动跳转至浏览器主界面</p>
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
