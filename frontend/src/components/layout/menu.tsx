import { useEffect, useState } from 'react'
import IconConsole from '@renderer/assets/console.svg'
import IconSetting from '@renderer/assets/setting.svg'
import { Link, useLocation } from 'react-router'
import IconHome from '@renderer/assets/home.svg'
import IconGithub from '@renderer/assets/github.svg'
import IconThemeDefault from '@renderer/assets/theme-default.svg'
import IconThemeDark from '@renderer/assets/theme-dark.svg'
import { darkThemeName, lightThemeName } from '../../types/type'
import * as runtime from '@wailsio/runtime'
import * as logger from '../../../bindings/github.com/wailsapp/wails/v3/pkg/services/log'
import { App, SettingService } from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { getTextHead } from '../../services/utils'

export default function Menu() {
  const location = useLocation();
  const [theme, setTheme] = useState("light")
  const [app, setApp] = useState<App[]>()
  useEffect(() => {
    logger.LogService.Info("我是前端来测试的")

    SettingService.Get().then(res => {
      if (res.Apps) {
        setApp(res.Apps)
      }
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
        return <li className='items-center' key={item.RunParams.Name}>
          <Link to={`/console/${item.RunParams.Name}`} className={`p-4 font-semibold text-xl shadow-md ${isActive(`/console/${item.RunParams.Name}`) ? " menu-active fill-neutral-content" : "fill-base-content"}`}>
            {getTextHead(item.RunParams.Name, 2)}
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
      <li className='items-center' onClick={async () => {
        await runtime.Browser.OpenURL("https://dpanel.cc")
      }}>
        <div
          className="p-4 fill-base-content"
        >
          <IconHome />
        </div>
      </li>
      <li className='items-center' onClick={async () => {
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
