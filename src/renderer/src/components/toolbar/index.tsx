import React, { useEffect, useState } from 'react'
import IconHome from '@renderer/assets/home.svg'
import IconMenu from '@renderer/assets/menu.svg'
import IconThemeDefault from '@renderer/assets/theme-default.svg'
import IconThemeDark from '@renderer/assets/theme-dark.svg'

const darkThemeName = "dark"
const lightThemeName = "light"

export default function Toolbar() {
    const [theme, setTheme] = useState(lightThemeName)
    useEffect(() => {
        document.querySelector('html')?.setAttribute('data-theme', theme)
    }, [theme])

    return <div className='fill-primary-content'>
        <div
            tabIndex={0}
            role="button"
            className="btn btn-circle btn-ghost btn-sm p-2 mr-2 hover:bg-blue-900 border-none "
            onClick={async () => {
                await window.bridgeAPI.openUrl({
                    url: "http://127.0.0.1:8086"
                })
            }}
        >
            <IconHome />
        </div>
        <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-circle btn-ghost btn-sm p-2 mr-2 hover:bg-blue-900 border-none">
                <IconMenu />
            </div>
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
                <li><a>Item 1</a></li>
                <li><a>Item 2</a></li>
            </ul>
        </div>
        <label className="swap swap-rotate btn btn-circle btn-ghost btn-sm p-2 hover:bg-blue-900 border-none">
            <input type="checkbox" className="theme-controller" onClick={(e) => {
                setTheme((prev) => {
                    console.log(prev);
                    return prev == lightThemeName ? darkThemeName : lightThemeName
                })
            }} />
            <IconThemeDefault className="swap-off" width="18" height="18" />
            <IconThemeDark className="swap-on" width="18" height="18" />
        </label>
    </div>
}
