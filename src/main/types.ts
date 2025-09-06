import { ChildProcess } from "child_process"

export const PROCESS_EVENT_START = "process-start"
export const PROCESS_EVENT_STOP = "process-stop"
export const PROCESS_EVENT_RESTART = "process-restart"
export const PROCESS_EVENT_LOAD = "process-load"
export const PROCESS_EVENT_MESSAGE = "process-message" 

export const EVENT_OPEN_URL = "open-url"
export const EVENT_COPY_TO_CLIPBOARD = "copy-to-clipboard"

export const EVENT_RUN_CONFIG_MESSAGE = "run-config-message"
export const EVENT_RUN_CONFIG_LOAD = "run-config-load"
export const EVENT_RUN_CONFIG_SAVE = "run-config-save"

export type EventCallback = (...data: string[]) => void

export const PROCESS_STATUS_RUNNING = "running"
export const PROCESS_STATUS_KILLED = "killed"
export const PROCESS_STATUS_EXITED = "exited"
export const PROCESS_STATUS_STOP = "stop"

export interface OpenUrlParams {
  url: string,
}

export interface ProcessRunParams {
  name: string,
  command: string
  args: string[]
  ctrl: "start" | "stop" | "restart"
}

export interface ProcessResult {
  name: string,
  pid?: number
  process?: ChildProcess
}

export interface ProcessMessageResult {
  log?:string,
  status?:string,
}