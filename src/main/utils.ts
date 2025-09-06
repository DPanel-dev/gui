import { ChildProcess } from "child_process";
import { dialog, IpcMainEvent } from "electron";
import net from 'net'
import { PROCESS_STATUS_EXITED, PROCESS_STATUS_KILLED, PROCESS_STATUS_RUNNING, PROCESS_STATUS_STOP } from "./types";

export function debug(...message: any[]) {
  console.log(`[${new Date().toISOString()}]`, ...message);
}

export function showDialogError(message: string) {
  dialog.showErrorBox(
    'Error',
    message
  );
}

let history:string[][] = []

export function eventReply(event:IpcMainEvent, name: string, ...message: string[]) {
  history.push(message)
   if (history.length > 50) {
    history.shift()
  }
  event.reply(name, ...message);
  debug(name, message)
}

export function eventReplyHistory() {
  return history
}

export function getProcessStatus(child?:ChildProcess):string {
  if (!child || !child.pid) {
    return PROCESS_STATUS_STOP
  }
  if (child.exitCode !== null) {
    return PROCESS_STATUS_EXITED
  }
  if (child.killed) {
    return PROCESS_STATUS_KILLED
  }
  return PROCESS_STATUS_RUNNING
}

export async function getFreePort():Promise<number> {
  return await new Promise((resolve) => {
    const server = net.createServer();
    let port = 8086
    server.listen(0, () => {
      if (!server) {
        resolve(port)
        return
      }
      const address = server.address()
      if (address && typeof address != "string") {
        port = address.port
      }
      server.close(() => resolve(port));
    });
  });
}