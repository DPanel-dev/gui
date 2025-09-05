import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getPlatform: () => Promise<string>;
      startProcess: (config: {
        name: string,
        command: string
        args: string[]
      }) => void
      getProcess:(name:string) => Promise<any>
      onProcessError: (callback: (data: string) => void) => void
      onProcessLog: (callback: (data: string) => void) => void
      openUrl: (params: {
        url: string,
      }) => Promise<void>
    }
  }
}