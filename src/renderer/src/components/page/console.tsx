import { FitAddon } from '@xterm/addon-fit'
import { ITerminalOptions, Terminal } from '@xterm/xterm'
import React, { useEffect, useRef } from 'react'
import IconReload from '@renderer/assets/reload.svg'
import IconPause from '@renderer/assets/pause.svg'

const TtyDefaultOption: ITerminalOptions = {
  convertEol: true,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontWeight: 400,
  fontSize: 16,
  lineHeight: 1,
  cursorStyle: 'block',
  cursorInactiveStyle: 'outline',
  cursorBlink: true,
  letterSpacing: 0,
  theme: {
    foreground: '#bfbfbf',
    cursor: 'gray',
    selectionForeground: '#ffffff',
  },
}

let terminal: Terminal
let fitAddon: FitAddon
let init = false

export default function ConsolePage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (terminal) {
      terminal.dispose()
      window.removeEventListener("resize", resize)
    }
    window.addEventListener('resize', resize);
    fitAddon = new FitAddon()
    terminal = new Terminal(TtyDefaultOption)
    terminal.loadAddon(fitAddon)
    terminal.open(container)

    window.api.onProcessLog((data: string) => {
      terminal.write(String(data))
    })

    window.api.onProcessError((data: string) => {
      terminal.write(String(data))
    })

    if (!init) {
      runDPanel()
      init = true
    }
  }, [])

  useEffect(() => {
    resize()
  }, [terminal])

  function resize() {
    if (fitAddon) {
      fitAddon.fit()
    }
  }

  async function runDPanel() {
    console.log(terminal);

    terminal.clear()

    let commandName = ""
    const platform = await window.api.getPlatform()
    if (platform == "win32") {
      commandName = "dpanel.exe"
    } else {
      commandName = "./dpanel"
    }
    console.log("asdfasdf");

    window.api.startProcess({
      name: "dpanel",
      command: commandName,
      args: [
        "server:start"
      ]
    });
  }

  return (
    <div className='flex-1 h-full flex flex-col overflow-hidden'>
      {/* 菜单 */}
      <div className='bg-base-100 p-5 text-base-content'>
        <div className='bg-base-200 w-full rounded-box items-center no-animation p-5 flex'>
          <div className='prose w-60 mr-auto'>
            <h3 className='pl-5'>
              控制台
              <div className="badge badge-xs badge-info text-info-content ml-2">运行中</div>
            </h3>
          </div>
          <div className="join gap-0 mr-4  items-center">
            <label className="input">
              端口:
              <input type="text" className="grow" defaultValue={"8807"} />
            </label>
            <button className="btn join-item rounded-r-xl btn-primary" onClick={async () => {
              runDPanel()
            }}>启动</button>
          </div>
          <div className='gap-4 flex'>
            <button className="btn join-item rounded-xl btn-info text-base-content fill-base-content">
              <IconReload className='w-4' />
              重启
            </button>
            <button className="btn join-item rounded-xl btn-error text-base-content fill-base-content">
              <IconPause className='w-4' />
              停止
            </button>
          </div>
        </div>
      </div>
      <div className="p-5 pt-0 flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className='h-full'
        ></div>
      </div>
    </div>
  )
}