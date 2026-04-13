'use client'

import { Bell, CheckCircle2, Calendar, MessageSquare, FileText, Package, AlertCircle, Receipt } from 'lucide-react'
import { useClientNotifications } from '@/contexts/ClientNotificationContext'

const TYPE_ICON: Record<string, React.ReactNode> = {
  booking:      <Calendar className="h-4 w-4" />,
  message:      <MessageSquare className="h-4 w-4" />,
  contract:     <FileText className="h-4 w-4" />,
  estimate:     <FileText className="h-4 w-4" />,
  item:         <Package className="h-4 w-4" />,
  alert:        <AlertCircle className="h-4 w-4" />,
  invoice:      <Receipt className="h-4 w-4" />,
}

export default function ClientNotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useClientNotifications()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading notifications...</div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary-600" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-primary-600 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            You'll receive notifications here about your events, invoices, contracts, and more.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {notifications.map((notif: any) => {
            const icon = TYPE_ICON[notif.type] ?? <Bell className="h-4 w-4" />
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  !notif.read ? 'bg-primary-50 cursor-pointer hover:bg-primary-100' : 'bg-white'
                }`}
              >
                <div className={`mt-0.5 h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.read ? 'bg-gray-100 text-gray-400' : 'bg-primary-100 text-primary-600'
                }`}>
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  {notif.title && (
                    <p className={`text-sm font-semibold ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notif.title}
                    </p>
                  )}
                  <p className={`text-sm ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                    {notif.message ?? notif.body ?? notif.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {notif.read ? (
                  <CheckCircle2 className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

                    </p>
                  )}
                  <p className={`text-sm ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                    {notif.message ?? notif.body ?? notif.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {notif.read ? (
                  <CheckCircle2 className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
