import * as notification from '../../bindings/github.com/wailsapp/wails/v3/pkg/services/notifications'
import * as runtime from '@wailsio/runtime'

export async function systemNotice(...message: string[]) {
  if (runtime.System.IsMac()) {
    return
  }
  notification.NotificationService.SendNotification({
    id: "dpanel-desktop",
    title: message.join(" "),
    categoryId: "dpanel-desktop",
  })
}