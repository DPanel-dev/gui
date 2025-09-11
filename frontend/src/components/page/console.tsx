import { FitAddon } from '@xterm/addon-fit'
import { ITerminalOptions, Terminal, ITerminalInitOnlyOptions } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import IconReload from '@renderer/assets/reload.svg'
import IconPause from '@renderer/assets/pause.svg'
import IconHome from '@renderer/assets/home.svg'
import IconStart from '@renderer/assets/start.svg'
import { SearchAddon } from '@xterm/addon-search'
import * as runtime from '@wailsio/runtime'
import { getEventName, runCommand, stopCommand } from '../../services/command'
import { systemError } from '../../services/notice'
import { useParams } from 'react-router'
import { ProcessEventMessage, ProcessService, RunOption } from '../../../bindings/github.com/donknap/dpanel-gui/services/process'
import { App, SettingService } from '../../../bindings/github.com/donknap/dpanel-gui/services/setting'
import { LogService } from '../../../bindings/github.com/wailsapp/wails/v3/pkg/services/log'

const TtyDefaultOption: ITerminalOptions & ITerminalInitOnlyOptions = {
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
  const { id } = useParams();
  const [appConfig, setAppConfig] = useState<App>()
  const eventName = getEventName(id ?? "")

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    console.log(id);
    if (!id) {
      return
    }

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
          runtime.Clipboard.SetText(selection)
        }
      }
      return true;
    })

    terminal.onRender(() => {
      fitAddon.fit()
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    setTimeout(() => {
      SettingService.GetApp(id).then(res => {
        LogService.Info("js get config", "config", res)
        if (!res) {
          systemError("未找到当前应用的配置，请完善 setting.json ")
          return
        }
        runtime.Events.Off(eventName)
        runtime.Events.On(eventName, (e) => {
          console.log(e)
          const message = e.data && Array.isArray(e.data) ? (e.data[0] as ProcessEventMessage) : null;
          if (message && message.Status) {
            setStatus(String(message.Status.trim()))
          }
          if (message && message.Log) {
            terminal.write(message.Log)
          }
        })
        ProcessService.GetProcessStatus(id).then((message: ProcessEventMessage) => {
          console.log("get process status", message);

          if (message && message.Status) {
            setStatus(String(message.Status.trim()))
          }
          if (message && message.Log) {
            terminal.write(message.Log)
          }
        })

        setAppConfig(res)
      })
    }, 500)

    return () => {
      console.log("events off all");
      runtime.Events.Off(eventName)
    }
  }, [id])

  function resize() {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  }

  async function runProcess(name: string, runOption: RunOption) {
    if (!name || !runOption) {
      systemError("启动参数错误，请完善 setting.json 配置文件")
    }
    terminalRef.current?.clear()
    const status = await runCommand(name, runOption)
    if (!status) {
      systemError("启动失败, 请查看控制台输出")
      setStatus("error")
    }
  }

  return <div className='flex-1 h-full flex flex-col overflow-hidden'>
    {/* 菜单 */}
    <div className='bg-base-300 rounded-box items-center no-animation p-5 m-5 flex'>
      <div className='prose w-80 mr-auto'>
        <h3 className='pl-5'>
          {appConfig?.Name} 控制台
          <div className="badge badge-sm badge-neutral ml-2">{status}</div>
        </h3>
      </div>
      <div className="gap-0 mr-4  items-center">
        <button className={`btn rounded-xl btn-primary mr-4 fill-primary-content ${!status?.includes("running") && "cursor-not-allowed"}`}
          onClick={async () => {
            appConfig?.HomeUrl && await runtime.Browser.OpenURL(appConfig.HomeUrl)
          }}
        >
          <IconHome className='w-4' />
          主界面
        </button>
      </div>
      <div className='gap-4 flex'>
        <button className={`btn join-item rounded-xl btn-success text-success-content/70 fill-success-content ${(status?.includes("running") || !appConfig) && " cursor-not-allowed"}`}
          onClick={() => {
            appConfig && runProcess(appConfig.Name, appConfig.RunOption)
          }}>
          <IconStart className='w-4' />
          启动
        </button>
        <button className="btn rounded-xl btn-warning text-warning-content/70 fill-warning-content" onClick={async () => {
          appConfig && await stopCommand(appConfig.Name)
          appConfig && await runProcess(appConfig.Name, appConfig.RunOption)
        }}>
          <IconReload className='w-4' />
          重启
        </button>
        <button className={`btn rounded-xl btn-error text-error-content/70 fill-error-content ${!status?.includes("running") && " cursor-not-allowed"}`}
          onClick={async () => {
            appConfig && stopCommand(appConfig.Name)
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