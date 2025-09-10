import { useEffect, useState } from 'react'
import IconSetting from '@renderer/assets/setting.svg'
import { Link, useLocation } from 'react-router'
import IconQuestion from '@renderer/assets/question-circle-fill.svg'
import IconGithub from '@renderer/assets/github.svg'
import IconThemeDefault from '@renderer/assets/theme-default.svg'
import IconThemeDark from '@renderer/assets/theme-dark.svg'
import { darkThemeName, EventSystemTheme, lightThemeName } from '../../types/type'
import * as runtime from '@wailsio/runtime'
import { App, SettingService } from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { getTextHead } from '../../services/utils'
import { WailsEvent } from '@wailsio/runtime/types/events'

export default function Menu() {
  const location = useLocation();
  const [theme, setTheme] = useState("light")
  const [app, setApp] = useState<App[]>()

  useEffect(() => {
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

    SettingService.GetAll().then(res => {
      if (res.Apps) {
        setApp(res.Apps)
        setTheme(res.System.Theme)
      }
    })

    runtime.Events.Off(EventSystemTheme)
    runtime.Events.On(EventSystemTheme, (res: WailsEvent) => {
      setTheme(res.data)
    })

  }, [])

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme)
  }, [theme])

  function isActive(pathname: string) {
    return location.pathname == pathname
  }

  return <div className='h-full bg-base-300 overflow-hidden' style={{ flex: '0 0 auto' }}>
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
          <input type="checkbox" className="theme-controller" onClick={() => {
            setTheme((prev) => {
              return prev == lightThemeName ? darkThemeName : lightThemeName
            })
          }} />

          <IconThemeDark className="swap-on" />
          <IconThemeDefault className="swap-off" />
        </label>
      </li>
      <li className='mt-5'></li>
      <li className='items-center cursor-pointer' onClick={async () => {
        await runtime.Browser.OpenURL("https://dpanel.cc/manual/system-desktop")
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
