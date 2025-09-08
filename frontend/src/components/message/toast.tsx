// components/GlobalToast.tsx
import { forwardRef, useState, useImperativeHandle } from 'react'

type MessageType = 'success' | 'error' | 'warning' | 'info'

export type ToastRefType = {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
  hide: () => void // 隐藏所有（可选）
}

type ToastMessage = {
  id: number
  message: string
  type: MessageType
}

let messageId = 0 // 全局自增 ID

const Toast = forwardRef<ToastRefType, {}>((_, ref) => {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const duration = 5000 // 每条消息显示 5 秒

  const show = (msg: string, msgType: MessageType = 'success') => {
    const id = ++messageId

    // 创建新消息
    const newMessage: ToastMessage = { id, message: msg, type: msgType }

    setMessages((prev) => {
      let updated = [...prev, newMessage]

      // 限制最多 3 条，移除最老的
      if (updated.length > 3) {
        updated.shift() // 删除第一条（最早的消息）
      }

      return updated
    })

    // 设置定时器自动移除
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    }, duration)
  }

  // 暴露方法给 ref
  useImperativeHandle(ref, () => ({
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    warning: (msg: string) => show(msg, 'warning'),
    info: (msg: string) => show(msg, 'info'),
    hide: () => setMessages([]), // 清空所有消息
  }))

  if (messages.length === 0) return null

  return (
    <div className="toast toast-top toast-center mt-4 z-50 pointer-events-none space-y-2">
      {messages.map((msg) => (
        <div key={msg.id} className="pointer-events-auto">
          <div className={`alert shadow-lg px-4 py-2 max-w-xs ${getAlertClass(msg.type)}`}>
            <span className="text-white font-medium">{msg.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
})

// 辅助函数：根据类型返回 DaisyUI class
function getAlertClass(type: MessageType) {
  switch (type) {
    case 'success':
      return 'alert-success'
    case 'error':
      return 'alert-error'
    case 'warning':
      return 'alert-warning'
    case 'info':
      return 'alert-info'
    default:
      return 'alert-info'
  }
}

Toast.displayName = 'GlobalToast'

export default Toast