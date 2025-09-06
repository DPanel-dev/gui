import React, { useEffect } from 'react'
import IconConsole from '@renderer/assets/console.svg'
import IconSetting from '@renderer/assets/setting.svg'
import { Link, useLocation } from 'react-router'

export default function Menu() {
  const location = useLocation();

  useEffect(() => {

  }, [location])

  function isActive(pathname: string) {
    return location.pathname.includes(pathname)
  }

  return <div className=' w-15 h-full bg-base-300 overflow-hidden' style={{ flex: '0 0 auto' }}>
    <ul className="menu w-auto p-0">
      <li>
        <Link to={"/console"} className={`p-4 ${isActive("/console") ? "fill-base-content" : "fill-base-content/50"}`}>
          <IconConsole />
        </Link>
      </li>
      <li>
        <Link to={"/setting"} className={`p-4 ${isActive("/setting") ? "fill-base-content" : "fill-base-content/50"}`}>
          <IconSetting />
        </Link>
      </li>
    </ul>
  </div>
}
