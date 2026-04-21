'use client'

/**
 * ClientNotificationContext
 * Fetches and manages client portal notifications.
 * Provides unreadCount + helpers so the layout bell badge and notifications page stay in sync.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import clientApi from '@/lib/clientApi'
import { useClientAuth } from './ClientAuthContext'

interface ClientNotification {
  id: string
  type: string
  title?: string
  message: string
  read: boolean
  created_at: string
  is_dynamic?: boolean
}

interface ClientNotificationContextValue {
  notifications: ClientNotification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => void
}

const ClientNotificationContext = createContext<ClientNotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refresh: () => {},
})

export function ClientNotificationProvider({ children }: { children: React.ReactNode }) {
  const { isClientAuthenticated } = useClientAuth()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [loading, setLoading] = useState(true)
  const refreshRef = useRef(0)

  const fetch = useCallback(async () => {
    if (!isClientAuthenticated) return
    try {
      const res = await clientApi.get('/notifications')
      setNotifications(res.data || [])
    } catch {
      // silently ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [isClientAuthenticated])

  useEffect(() => {
    fetch()
    // Refresh every 5 minutes while portal is open
    const interval = setInterval(() => fetch(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetch])

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    // Only call API for real DB notifications (not dynamic ones)
    if (!id.startsWith('dynamic-')) {
      try {
        await clientApi.put(`/notifications/${id}/read`)
      } catch {
        // revert on error
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n))
      }
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read)
    // Optimistic update for all
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    // API calls only for real DB notifications
    const dbUnread = unread.filter(n => !n.id.startsWith('dynamic-'))
    await Promise.allSettled(dbUnread.map(n => clientApi.put(`/notifications/${n.id}/read`)))
  }, [notifications])

  const refresh = useCallback(() => { fetch() }, [fetch])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <ClientNotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh }}>
      {children}
    </ClientNotificationContext.Provider>
  )
}

export function useClientNotifications() {
  return useContext(ClientNotificationContext)
}
