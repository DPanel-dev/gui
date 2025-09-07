import { app, shell, BrowserWindow, ipcMain, screen, clipboard, Tray, Menu, dialog } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'
import fs from "fs"
import { debug, eventReply, eventReplyHistory, getFreePort, getProcessStatus, showDialogError } from './utils'
import { EVENT_OPEN_URL, OpenUrlParams, 
  PROCESS_EVENT_START, ProcessResult, ProcessRunParams, 
  PROCESS_EVENT_STOP, EVENT_COPY_TO_CLIPBOARD, EVENT_RUN_CONFIG_LOAD, 
  EVENT_RUN_CONFIG_SAVE,
  PROCESS_EVENT_LOAD,
  ProcessMessageResult,
  PROCESS_EVENT_MESSAGE,
  PROCESS_STATUS_EXITED,
  PROCESS_STATUS_RUNNING,
} from './types'


const workDir = path.join(process.cwd(), "runtime")
const runConfigPath = path.join(workDir, 'config.json')
let runConfig = {
  theme: 'light',
  autoLaunch: false,
  closeWindowHide:true,
  autoOpenAppServerUrl:false,
  env:{
    "APP_SERVER_PORT":0,
    "STORAGE_LOCAL_PATH": path.join(workDir, "data"),
  }
}
let runProcess: ProcessResult[] = []

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

  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow.hide();
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const displays = screen.getAllDisplays()
  if (is.dev && displays.length > 1) {
    mainWindow.setPosition(displays[1].bounds.x, 0)
  }
  mainWindow.webContents.openDevTools()
  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const appTray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '界面', click: () => mainWindow.show() },
    { label: '退出', role: 'quit' } ,
    { type: 'separator' },
    {
      label: '关于', click:() => {
        shell.openExternal("https://dpanel.cc")
      } 
    },
  ]);

  appTray.setToolTip('DPanel Desktop');
  appTray.setContextMenu(contextMenu);

  appTray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function initConfig() {
  if (!fs.existsSync(runConfigPath)) {
    try {
      const idlePort = await getFreePort()
      runConfig.env.APP_SERVER_PORT = idlePort

      await fs.promises.writeFile(
        runConfigPath,
        JSON.stringify(runConfig, null, 2),
        'utf-8'
      )
    } catch (err) {
      dialog.showErrorBox("DPanel Message", "配置初始化失败, " + err)
      app.exit()
    }
  } else {
    try {
      const data = await fs.promises.readFile(runConfigPath, 'utf-8')
      runConfig = JSON.parse(data)
    } catch (err) {
      dialog.showErrorBox("DPanel Message", "配置文件读取失败：" + err)
      app.exit()
      return
    }
  }
  if (!fs.existsSync(runConfig.env.STORAGE_LOCAL_PATH)) {
    await fs.promises.mkdir(runConfig.env.STORAGE_LOCAL_PATH, { recursive: true });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  
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

  ipcMain.on(EVENT_OPEN_URL, async (event, params: OpenUrlParams) => {
    eventReply(event, "openUrl", params.url)
    shell.openExternal(params.url)
    return 
  })

  ipcMain.handle(EVENT_COPY_TO_CLIPBOARD, (_, text:string) => {
    return clipboard.writeText(text);
  })

  ipcMain.handle(EVENT_RUN_CONFIG_LOAD, () => {
    return JSON.stringify(runConfig)
  })

  ipcMain.handle(EVENT_RUN_CONFIG_SAVE, async (_, params) => {
    const result = {...params, ...{env: {
      ...params.env || {},
      "STORAGE_LOCAL_PATH": path.join(workDir, "data"),
    }}}
    await fs.promises.writeFile(
      runConfigPath,
      JSON.stringify(result, null, 2),
      'utf-8'
    )
    runConfig = result
    return runConfig
  })

  ipcMain.handle(PROCESS_EVENT_LOAD, (_, name): ProcessMessageResult => {
    let myProcess:ProcessResult|undefined = runProcess.find(item => item.name == name)
    const history = eventReplyHistory().map(item => {
      return item[1]
    }).join("")
    if (myProcess) {
      return {
        log: history,
        status: getProcessStatus(myProcess.process)
      }
    }  else {
      return {
        log: history,
        status: "exited"
      }
    }
  })

  ipcMain.on(PROCESS_EVENT_START, async (event: Electron.IpcMainEvent, params: ProcessRunParams) => {
    let myProcess:ProcessResult|undefined = runProcess.find(item => item.name == params.name)
    if (myProcess) {
      eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(myProcess.process))
      return;
    }
    let defaultEnv = {
      "PATH": `${process.env.PATH}${path.delimiter}${workDir}`
    }
    
    if (runConfig && runConfig.env) {
      defaultEnv = {
        ...defaultEnv,
        ...runConfig.env,
      }
    }
    const options = {
      cwd: workDir,
      env: {...process.env, ...defaultEnv},
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
      eventReply(event, PROCESS_EVENT_MESSAGE, PROCESS_STATUS_EXITED, String(e) + "\n")
      return
    }

    try {
      const childProcess = spawn(params.command, params.args, options);

      childProcess.stdout && childProcess.stdout.on('data', (data) => {
        eventReply(event, PROCESS_EVENT_MESSAGE, PROCESS_STATUS_RUNNING, data.toString())
      });

      childProcess.stderr && childProcess.stderr.on('data', (data) => {
        eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(childProcess), data.toString())
      });

      childProcess.on('close', (code) => {
        runProcess = runProcess.filter(item => item.pid != childProcess.pid)
        const message = `Process Exit Code: ${code}, Pid: ${childProcess.pid}, RunProcess: ${runProcess.length}, Option:  ${JSON.stringify(options)}`
        eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(childProcess), message)
      });

      childProcess.on('error', (err) => {
        runProcess = runProcess.filter(item => item.pid != childProcess.pid)
        const message = `Process Error Message: ${err.message}`
        eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(childProcess), message)
      });

      eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(childProcess))

      runProcess.push({
        name: params.name,
        process: childProcess,
        pid: childProcess.pid,
      })

    } catch (err) {
      const message = `Process Exit Message: ${err}, Option: ${JSON.stringify(options)}`
      eventReply(event, PROCESS_EVENT_MESSAGE, PROCESS_STATUS_EXITED, message)
    }
  });

  ipcMain.on(PROCESS_EVENT_STOP, async (event: Electron.IpcMainEvent, params: ProcessRunParams) => {
    let myProcess:ProcessResult|undefined = runProcess.find(item => item.name == params.name)
    if (!myProcess) {
      eventReply(event, PROCESS_EVENT_MESSAGE, PROCESS_STATUS_EXITED)
      return;
    }
    try {
      myProcess.process?.kill()
      eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(myProcess.process))
    } catch(e) {
      eventReply(event, PROCESS_EVENT_MESSAGE, getProcessStatus(myProcess.process), String(e))
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

    app.exit()
  });

  await initConfig()
  
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