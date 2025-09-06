import React, { useEffect, useState } from 'react'
import IconHome from '@renderer/assets/home.svg'
import IconGithub from '@renderer/assets/github.svg'
import IconThemeDefault from '@renderer/assets/theme-default.svg'
import IconThemeDark from '@renderer/assets/theme-dark.svg'

const darkThemeName = "black"
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
                window.api.openUrl({
                    url: "https://dpanel.cc"
                })
            }}
        >
            <IconHome />
        </div>
        <div
            tabIndex={0}
            role="button"
            className="btn btn-circle btn-ghost btn-sm p-2 mr-2 hover:bg-blue-900 border-none "
            onClick={async () => {
                window.api.openUrl({
                    url: "https://github.com/donknap/dpanel"
                })
            }}
        >
            <IconGithub />
        </div>
        <label className="swap swap-rotate btn btn-circle btn-ghost btn-sm p-2 hover:bg-blue-900 border-none">
            <input type="checkbox" className="theme-controller" onClick={() => {
                setTheme((prev) => {
                    return prev == lightThemeName ? darkThemeName : lightThemeName
                })
            }} />
            <IconThemeDefault className="swap-off" width="18" height="18" />
            <IconThemeDark className="swap-on" width="18" height="18" />
        </label>
    </div>
}
