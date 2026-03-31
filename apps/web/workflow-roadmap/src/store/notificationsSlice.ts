import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { z } from 'zod'

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  receivedAt: z.string(),
  read: z.boolean(),
})

export type Notification = z.infer<typeof NotificationSchema>

interface NotificationsState {
  items: Notification[]
}

const initialState: NotificationsState = {
  items: [],
}

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    pushNotification(state, action: PayloadAction<Omit<Notification, 'read'>>) {
      state.items.unshift({ ...action.payload, read: false })
    },
    markAllRead(state) {
      state.items.forEach(n => {
        n.read = true
      })
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find(item => item.id === action.payload)
      if (n) n.read = true
    },
    clearAll(state) {
      state.items = []
    },
  },
})

export const { pushNotification, markAllRead, markRead, clearAll } = notificationsSlice.actions

export function selectUnreadCount(state: { notifications: NotificationsState }) {
  return state.notifications.items.filter(n => !n.read).length
}

export function selectNotifications(state: { notifications: NotificationsState }) {
  return state.notifications.items
}
