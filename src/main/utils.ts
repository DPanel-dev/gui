import { dialog, IpcMainEvent } from "electron";

export function debug(...message: any[]) {
  console.log(`[${new Date().toISOString()}]`, ...message);
}

export function showDialogError(message: string) {
  dialog.showErrorBox(
    'Error',
    message
  );
}

export function eventReply(event:IpcMainEvent, name: string, message: string) {
  message = (message.endsWith("\n") || message.endsWith("\r")) ? message : message + "\n"
  event.reply(name, `${message}`);
  debug(name, message)
}