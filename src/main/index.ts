import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ChildProcess, spawn } from 'child_process'
import fs from "fs"
import { debug, eventReply, showDialogError } from './utils'
import { EVENT_OPEN_URL, OpenUrlParams, PROCESS_EVENT_ERROR, PROCESS_EVENT_FETCH, PROCESS_EVENT_LOG, PROCESS_EVENT_START, ProcessResult, ProcessRunParams } from './types'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: "DPanel Desktop",
    minWidth: 600,
    minHeight: 600,
    width: 1200,
    height: 800,
    titleBarStyle: "hidden",
    // expose window controls in Windows/Linux
    titleBarOverlay: {
      color: "#ffffff00",
      height: 45,
    },
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log(details);
    
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const displays = screen.getAllDisplays()
  if (is.dev && displays.length > 1) {
    mainWindow.setPosition(displays[1].bounds.x, 0)
  }

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

let runProcess: ProcessResult[] = []
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle("getPlatform", () => {
    return process.platform
  })

  ipcMain.handle(PROCESS_EVENT_FETCH, (evnet, name: string) => {
    return runProcess.find(item => item.name == name)
  })

  ipcMain.on(EVENT_OPEN_URL, async (event, params: OpenUrlParams) => {
    eventReply(event, "openUrl", params.url)
    shell.openExternal(params.url)
    return 
  })

  ipcMain.on(PROCESS_EVENT_START, async (event: Electron.IpcMainEvent, params: ProcessRunParams) => {
    let myProcess:ProcessResult|undefined = runProcess.find(item => item.name == params.name)
    if (myProcess) {
      return;
    }

    const workDir = path.join(__dirname, "../", "runtime")
    const options = {
      cwd: workDir,
      env: {...process.env, ...{
        "STORAGE_LOCAL_PATH": path.join(workDir, "data"),
      }},
      detached: false
    }

    debug(PROCESS_EVENT_START, params, options);

    try {
      await new Promise<boolean>((resolve, reject) => {
        fs.access(path.join(workDir, params.command), fs.constants.X_OK, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve(true)
          }
        });
      })
    } catch (e) {
      showDialogError(String(e))
      eventReply(event, PROCESS_EVENT_ERROR, String(e))
      return
    }

    try {
      const childProcess = spawn(params.command, params.args, options);

      childProcess.stdout && childProcess.stdout.on('data', (data) => {
        eventReply(event, PROCESS_EVENT_LOG, data.toString())
      });

      childProcess.stderr && childProcess.stderr.on('data', (data) => {
        eventReply(event, PROCESS_EVENT_LOG, data.toString())
      });

      childProcess.on('close', (code) => {
        runProcess = runProcess.filter(item => item.pid != childProcess.pid)
        const message = `Process Exit Code: ${code}, Pid: ${childProcess.pid}, RunProcess: ${runProcess.length}`
        eventReply(event, PROCESS_EVENT_ERROR, message)
      });
      childProcess.on('error', (err) => {
        runProcess = runProcess.filter(item => item.pid != childProcess.pid)
        const message = `Process Error Message: ${err.message}`
        eventReply(event, PROCESS_EVENT_ERROR, message)
      });

      runProcess.push({
        name: params.name,
        process: childProcess,
        pid: childProcess.pid,
      })

    } catch (err) {
      const message = `Process Exit Message: ${err}`
      eventReply(event, PROCESS_EVENT_ERROR, message)
    }
  });

  app.on('before-quit', () => {
    runProcess.forEach(item => {
      if (item && item.process && !item.process.killed) {
        try {
          item.process.kill()
        } catch (err) {
          console.warn(`Kill Child Process ${item.process.pid} Failed:`, err)
        }
      }
    })
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
