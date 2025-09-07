import { FitAddon } from '@xterm/addon-fit'
import { ITerminalOptions, Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import IconReload from '@renderer/assets/reload.svg'
import IconPause from '@renderer/assets/pause.svg'
import IconSend from '@renderer/assets/send.svg'
import IconStart from '@renderer/assets/start.svg'
import { SearchAddon } from '@xterm/addon-search'
import * as runtime from '../../../wailsjs/runtime'
import { GetOSInfo, ProcessRun } from '../../../wailsjs/go/main/App';

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

export default function ConsolePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [status, setStatus] = useState<string>()
  const [port, setPort] = useState(8086)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (terminalRef.current) {
      terminalRef.current.dispose()
      window.removeEventListener("resize", resize)
    }
    window.addEventListener('resize', resize);

    const fitAddon = new FitAddon()
    const terminal = new Terminal(TtyDefaultOption)
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(searchAddon)
    terminal.open(container)

    terminal.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const selection = terminal.getSelection();
        if (selection) {
          // window.api && window.api.copyToClipboard(selection)
        }
      }
      return true;
    })

    runtime.EventsOn("event-process", (status, log) => {
      if (log) {
        terminal.write(log)
      }
      if (status) {
        setStatus(String(status.trim()))
      }
    })

    // window.api && window.api.runConfigLoad().then(res => {
    //   const data = JSON.parse(res) as ConfigResult
    //   if (data && data.env && data.env.APP_SERVER_PORT) {
    //     setPort(data.env.APP_SERVER_PORT)
    //   }
    // })

    // window.api && window.api.onProcessMessage((status, log) => {
    //   if (log) {
    //     terminal.write(log)
    //   }
    //   if (status) {
    //     setStatus(String(status.trim()))
    //   }
    // })

    // window.api && window.api.processLoad("dpanel").then(res => {
    //   setStatus(String(res.status.trim()))
    //   terminal.write(res.log)
    // })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    if (!window.__DPANEL_STARTED__) {
      runDPanel()
      window.__DPANEL_STARTED__ = true
    }
  }, [])

  useEffect(() => {
    resize()
  }, [terminalRef.current])


  function resize() {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  }

  async function runDPanel() {
    terminalRef.current?.clear()
    let commandName = ""
    const OSInfo = await GetOSInfo()
    if (OSInfo.platform == "windows") {
      commandName = "dpanel.exe"
    } else {
      commandName = "./dpanel"
    }
    const status = await ProcessRun(commandName, [
      "server:start"
    ])
    if (!status) {
      setStatus("error")
    }
  }

  return <div className='flex-1 h-full flex flex-col overflow-hidden'>
    {/* 菜单 */}
    <div className='bg-base-300 rounded-box items-center no-animation p-5 m-5 flex'>
      <div className='prose w-60 mr-auto'>
        <h3 className='pl-5'>
          控制台
          <div className="badge badge-sm badge-soft badge-primary ml-2">{status}</div>
        </h3>
      </div>
      <div className="join gap-0 mr-4  items-center">
        <button disabled={status != "running"} className="btn rounded-xl btn-primary mr-4 fill-primary-content" onClick={async () => {
          // window.api.openUrl({
          //   url: `http://127.0.0.1:${port}`
          // })
        }}>
          <IconSend className='w-4' />
          主界面
        </button>
      </div>
      <div className='gap-4 flex'>
        <button disabled={status == "running"} className="btn join-item rounded-xl btn-success text-success-content fill-success-content" onClick={() => {
          runDPanel()
        }}>
          <IconStart className='w-4' />
          启动
        </button>
        <button className="btn rounded-xl btn-warning text-warning-content fill-warning-content" onClick={() => {
          // window.api.processCtrl({
          //   name: "dpanel",
          //   ctrl: "restart",
          // });
        }}>
          <IconReload className='w-4' />
          重启
        </button>
        <button disabled={status != "running"} className={`btn rounded-xl btn-error  text-error-content fill-error-content`} onClick={() => {
          // window.api.processCtrl({
          //   name: "dpanel",
          //   ctrl: "stop",
          // });
        }}>
          <IconPause className='w-4' />
          停止
        </button>
      </div>
    </div>
    <div className="p-5 pt-0 flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className='h-full'
      ></div>
    </div>
  </div>
}