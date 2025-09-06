import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENT_OPEN_URL, EventCallback, OpenUrlParams,
   PROCESS_EVENT_START, ProcessRunParams, 
   PROCESS_EVENT_STOP, EVENT_COPY_TO_CLIPBOARD, EVENT_RUN_CONFIG_LOAD, 
   EVENT_RUN_CONFIG_SAVE, PROCESS_EVENT_RESTART, 
   PROCESS_EVENT_LOAD,
   PROCESS_EVENT_MESSAGE} from '../main/types';

// Custom APIs for renderer
const api = {
  getPlatform: () => {
    return ipcRenderer.invoke("getPlatform")
  },
  copyToClipboard: (text:string) => {
    return ipcRenderer.invoke(EVENT_COPY_TO_CLIPBOARD, text)
  },
  openUrl: (params: OpenUrlParams) => {
    ipcRenderer.send(EVENT_OPEN_URL, params)
  },

  processCtrl: (params: ProcessRunParams) => {
    switch (params.ctrl) {
      case "start":
        return ipcRenderer.send(PROCESS_EVENT_START, params)
      case "stop":
        return ipcRenderer.send(PROCESS_EVENT_STOP, params)
      case "restart":
        return ipcRenderer.send(PROCESS_EVENT_RESTART, params)
    }
  },
  processLoad: (name:string) => {
    return ipcRenderer.invoke(PROCESS_EVENT_LOAD, name)
  },
  onProcessMessage: (callback: EventCallback) => {
    ipcRenderer.removeAllListeners(PROCESS_EVENT_MESSAGE);
    ipcRenderer.on(PROCESS_EVENT_MESSAGE, (event, status, log) => callback(status, log));
  },

  runConfigLoad: () => {
    return ipcRenderer.invoke(EVENT_RUN_CONFIG_LOAD);
  },
  runConfigSave: (params:any) => {
    return ipcRenderer.invoke(EVENT_RUN_CONFIG_SAVE, params)
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
