'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationType } from '@/types'
import { 
  Bell, 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  Check
} from 'lucide-react'

export default function NotificationPanel() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications 
  } = useNotifications()
  
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.EVENT_TODAY:
        return <Calendar className="h-5 w-5 text-red-500" />
      case NotificationType.EVENT_UPCOMING:
        return <Calendar className="h-5 w-5 text-blue-500" />
      case NotificationType.NEW_CLIENT:
        return <Users className="h-5 w-5 text-green-500" />
      case NotificationType.NEW_BOOKING:
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case NotificationType.PAYMENT_RECEIVED:
        return <DollarSign className="h-5 w-5 text-green-500" />
      case NotificationType.PAYMENT_OVERDUE:
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case NotificationType.CONTRACT_SIGNED:
        return <FileText className="h-5 w-5 text-green-500" />
      case NotificationType.CONTRACT_SENT:
        return <FileText className="h-5 w-5 text-blue-500" />
      case NotificationType.MESSAGE_RECEIVED:
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      case NotificationType.INVOICE_OVERDUE:
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case NotificationType.GUEST_LIST_UPDATE:
        return <Users className="h-5 w-5 text-purple-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationBgColor = (type: NotificationType, read: boolean) => {
    if (read) return 'bg-white'
    
    switch (type) {
      case NotificationType.EVENT_TODAY:
        return 'bg-red-50'
      case NotificationType.EVENT_UPCOMING:
        return 'bg-blue-50'
      case NotificationType.NEW_CLIENT:
      case NotificationType.NEW_BOOKING:
      case NotificationType.PAYMENT_RECEIVED:
      case NotificationType.CONTRACT_SIGNED:
        return 'bg-green-50'
      case NotificationType.PAYMENT_OVERDUE:
      case NotificationType.INVOICE_OVERDUE:
        return 'bg-orange-50'
      default:
        return 'bg-gray-50'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5 lg:h-6 lg:w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 lg:top-1 lg:right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshNotifications()}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.link || '#'}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${getNotificationBgColor(notification.type, notification.read)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full"></span>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 ${notification.read ? 'text-gray-500' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Dashboard →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
