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
    __DPANEL_STARTED__: boolean
  }
}