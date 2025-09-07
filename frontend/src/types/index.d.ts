import { ElectronAPI } from '@electron-toolkit/preload'

export interface OpenUrlParams {
  url: string,
}

export interface ProcessRunParams {
  name: string,
  command?: string
  args?: string[]
  ctrl: "start" | "stop" | "restart"
}

export interface ProcessResult {
  name: string,
  pid?: number
  process?: ChildProcess
}

export interface ProcessMessageResult {
  log: string,
  status: string,
}

declare global {

  interface Window {
    api: {
      getPlatform: () => Promise<string>;
      copyToClipboard: (text: string) => Promise<void>
      openUrl: (params: OpenUrlParams) => Promise<void>
      processCtrl: (config: ProcessRunParams) => void
      processLoad: (name: string) => Promise<ProcessMessageResult>
      onProcessMessage: (callback: (status: string, log: string) => void) => void
      runConfigLoad: () => Promise<any>
      runConfigSave: (params: any) => Promise<void>
    },
    __DPANEL_STARTED__: boolean
  }
}