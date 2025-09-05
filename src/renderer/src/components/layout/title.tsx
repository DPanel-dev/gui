import React, { useEffect, useState } from 'react'
import Toolbar from '../toolbar'

export default function Title() {
  const [platform, setPlatform] = useState("windows")
  useEffect(() => {
    if (window.bridgeAPI) {
      window.bridgeAPI.getPlatform().then(res => {
        setPlatform(res)
      })
    }
  }, [])
  return <div className="titlebar bg-primary text-primary-content flex items-center h-full flex-auto flex-shrink-0">
    <div className={`drag w-20 ${platform == "win32" ? "ml-15" : "ml-28"}`}>
      asdfasdf
    </div>
    <div className="drag flex-1 h-full">

    </div>
    <div className={`w-48  ${platform == "win32" ? "mr-20" : ""}`}>
      <Toolbar />
    </div>
  </div>
}
