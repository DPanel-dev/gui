import { ChildProcess } from "child_process"

export const PROCESS_EVENT_ERROR = "process-error"
export const PROCESS_EVENT_LOG = "process-log"
export const PROCESS_EVENT_START = "process-start"
export const PROCESS_EVENT_STOP = "process-stop"
export const PROCESS_EVENT_STATUS = "process-status" 

export const EVENT_OPEN_URL = "open-url"

export type EventCallback = (data: string) => void

export type OpenUrlParams = {
  url: string,
}

export type ProcessRunParams = {
  name: string,
  command: string
  args: string[]
}

export interface ProcessResult {
  name: string,
  pid?: number
  process?: ChildProcess
}