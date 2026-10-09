import { useEffect, useRef, useState } from 'react'
import IconSetting from '@renderer/assets/setting.svg'
import { Link, useLocation } from 'react-router'
import IconQuestion from '@renderer/assets/question-circle-fill.svg'
import IconGithub from '@renderer/assets/github.svg'
import IconThemeDefault from '@renderer/assets/theme-default.svg'
import IconThemeDark from '@renderer/assets/theme-dark.svg'
import { darkThemeName, EventNativeTheme, EventSystemTheme, lightThemeName } from '../../types/type'
import * as runtime from '@wailsio/runtime'
import { App, SettingService } from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { getTextHead } from '../../services/utils'
import { WailsEvent } from '@wailsio/runtime/types/events'
import Toast, { ToastRefType } from '../message/toast'
import { getSettingAfterPendingSaves, saveSystemPatch } from '../../services/setting'

export default function Menu() {
  const location = useLocation();
  const [theme, setTheme] = useState<string | null>(null)
  const [app, setApp] = useState<App[]>()
  const toastRef = useRef<ToastRefType>(null)

  useEffect(() => {
    let active = true
    // setApp([
    //   {
    //     "Name": "dpanel",
    //     "HomeUrl": "http://${HOME_URL}:${APP_SERVER_PORT}",
    //     "RunOption": {
    //       "AutoLaunch": true,
    //       "WorkDir": "./",
    //       "StartCommand": "./dpanel server:start",
    //       "StopCommand": "",
    //       "Environment": [
    //         "APP_SERVER_PORT=8086",
    //         "STORAGE_LOCAL_PATH=${DP_WORK_DIR}/data",
    //         "HOME_URL=http://127.0.0.1"
    //       ],
    //       "LogMaxLine": 1000
    //     },
    //     "Setting": {
    //       "Environment": {
    //         "APP_SERVER_PORT": {
    //           "Description": "服务运行端口"
    //         },
    //         "HOME_URL": {
    //           "Description": "访问地址"
    //         },
    //         "STORAGE_LOCAL_PATH": {
    //           "Description": "数据存储目录"
    //         }
    //       }
    //     }
    //   },
    //   {
    //     "Name": "nginx",
    //     "HomeUrl": "http://${HOME_URL}:${APP_SERVER_PORT}",
    //     "RunOption": {
    //       "AutoLaunch": false,
    //       "WorkDir": "./",
    //       "StartCommand": "./dpanel server:start",
    //       "StopCommand": "",
    //       "Environment": [
    //         "APP_SERVER_PORT=8086",
    //       ],
    //       "LogMaxLine": 1000
    //     },
    //     "Setting": {
    //       "Environment": {
    //         "APP_SERVER_PORT": {
    //           "Description": "服务运行端口"
    //         },
    //       }
    //     }
    //   }
    // ])

    getSettingAfterPendingSaves().then(res => {
      if (active) {
        setApp(res.Apps ?? undefined)
        setTheme(res.System?.Theme || lightThemeName)
      }
    })

    const cancelThemeEvent = runtime.Events.On(EventSystemTheme, (res: WailsEvent) => {
      setTheme(res.data)
    })

    return () => {
      active = false
      cancelThemeEvent()
    }
  }, [])

  useEffect(() => {
    if (!theme) return
    document.querySelector('html')?.setAttribute('data-theme', theme)
    void runtime.Events.Emit(EventNativeTheme, theme)
  }, [theme])

  function isActive(pathname: string) {
    return location.pathname == pathname
  }

  return <div className='h-full bg-base-300 overflow-hidden' style={{ flex: '0 0 auto' }}>
    <Toast ref={toastRef} />
    <ul className="menu p-1 mr-0.5">
      {app?.map(item => {
        return <li className='items-center' key={item.Name}>
          <Link to={`/console/${item.Name}`} className={`p-4 font-semibold text-xl shadow-md ${isActive(`/console/${item.Name}`) ? " menu-active fill-neutral-content" : "fill-base-content"}`}>
            {getTextHead(item.Name, 2)}
          </Link>
        </li>
      })}

      <li className='items-center mt-3'>
        <Link to={"/setting"} className={`p-4 ${isActive("/setting") ? " menu-active fill-neutral-content" : "fill-base-content"}`}>
          <IconSetting />
        </Link>
      </li>
      <li className='items-center mt-3 '>
        <label className="swap swap-rotate p-4  fill-base-content">
          <input type="checkbox" className="theme-controller" checked={theme === darkThemeName} disabled={!theme} onChange={async () => {
            const nextTheme = theme === darkThemeName ? lightThemeName : darkThemeName
            setTheme(nextTheme)
            void runtime.Events.Emit(EventSystemTheme, nextTheme)
            try {
              await saveSystemPatch({ Theme: nextTheme })
            } catch (error) {
              toastRef.current?.error(`保存皮肤失败：${String(error)}`)
              try {
                const current = await getSettingAfterPendingSaves()
                void runtime.Events.Emit(EventSystemTheme, current.System.Theme || lightThemeName)
              } catch {
                // The save error has already been reported.
              }
            }
          }} />

          <IconThemeDark className="swap-on" />
          <IconThemeDefault className="swap-off" />
        </label>
      </li>
      <li className='mt-5'></li>
      <li className='items-center cursor-pointer' onClick={async () => {
        await runtime.Browser.OpenURL("https://dpanel.cc/install/desktop")
      }}>
        <div
          className="p-4 fill-base-content"
        >
          <IconQuestion />
        </div>
      </li>
      <li className='items-center cursor-pointer' onClick={async () => {
        await runtime.Browser.OpenURL("https://github.com/donknap/dpanel")
      }}>
        <div
          className="p-4 fill-base-content"
        >
          <IconGithub />
        </div>
      </li>
    </ul>
  </div>
}
