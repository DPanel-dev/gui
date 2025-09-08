import * as notification from '../../bindings/github.com/wailsapp/wails/v3/pkg/services/notifications'

export async function systemNotice(...message: string[]) {
  notification.NotificationService.SendNotification({
    id: "dpanel-desktop",
    title: message.join(" "),
    categoryId: "dpanel-desktop",
  })
}