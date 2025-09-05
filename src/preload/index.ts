import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENT_OPEN_URL, EventCallback, OpenUrlParams, PROCESS_EVENT_ERROR, PROCESS_EVENT_STATUS, PROCESS_EVENT_LOG, PROCESS_EVENT_START, ProcessRunParams, PROCESS_EVENT_STOP } from '../main/types';

// Custom APIs for renderer
const api = {
  getPlatform: () => {
    return ipcRenderer.invoke("getPlatform")
  },
  startProcess: (params: ProcessRunParams) => ipcRenderer.send(PROCESS_EVENT_START, params),
  stopProcess: (params: ProcessRunParams) => ipcRenderer.send(PROCESS_EVENT_STOP, params),
  onProcessError: (callback: EventCallback) => {
    ipcRenderer.removeAllListeners(PROCESS_EVENT_ERROR);
    ipcRenderer.on(PROCESS_EVENT_ERROR, (event, data) => callback(data));
  },
  onProcessLog: (callback: EventCallback) => {
    ipcRenderer.removeAllListeners(PROCESS_EVENT_LOG);
    ipcRenderer.on(PROCESS_EVENT_LOG, (event, data) => callback(data));
  },
  onProcessStatus:(callback: EventCallback) => {
    ipcRenderer.removeAllListeners(PROCESS_EVENT_STATUS);
    ipcRenderer.on(PROCESS_EVENT_STATUS, (event, data) => callback(data));
  },
  openUrl: (params: OpenUrlParams) => {
    ipcRenderer.send(EVENT_OPEN_URL, params)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
