'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from '@/lib/api'
import { Event, Booking, Notification, NotificationType, InvoiceStatus, ContractStatus } from '@/types'

interface IntakeForm {
  id: string
  contact_name: string
  contact_email: string
  event_type: string
  event_date: string
  status: string
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  status: InvoiceStatus
  due_date: string
  total_amount: number
  booking?: Booking
  intake_form?: IntakeForm
}

interface Contract {
  id: string
  contractNumber: string
  title: string
  status: ContractStatus
  clientId: string
  signedDate?: string
  createdAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const generateNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const generatedNotifications: Notification[] = []
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      // Fetch events
      try {
        const eventsRes = await api.get<Event[]>('/events')
        const events = eventsRes.data

        // Events happening today
        events.forEach(event => {
          const eventDate = new Date(event.date)
          const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
          
          if (eventDateOnly.getTime() === today.getTime()) {
            generatedNotifications.push({
              id: `event-today-${event.id}`,
              type: NotificationType.EVENT_TODAY,
              title: 'Event Today!',
              message: `"${event.name}" is happening today${event.startTime ? ` at ${event.startTime}` : ''}`,
              read: false,
              link: `/dashboard/events/${event.id}/manage`,
              eventId: event.id,
              event: event,
              createdAt: new Date().toISOString(),
            })
          } else if (eventDateOnly > today && eventDateOnly <= weekFromNow) {
            // Upcoming events in the next 7 days
            const daysUntil = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
            generatedNotifications.push({
              id: `event-upcoming-${event.id}`,
              type: NotificationType.EVENT_UPCOMING,
              title: 'Upcoming Event',
              message: `"${event.name}" is in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${eventDate.toLocaleDateString()})`,
              read: false,
              link: `/dashboard/events/${event.id}/manage`,
              eventId: event.id,
              event: event,
              createdAt: new Date().toISOString(),
            })
          }
        })
      } catch (error) {
        console.error('Failed to fetch events for notifications:', error)
      }

      // Fetch new clients (intake forms)
      try {
        const clientsRes = await api.get<IntakeForm[]>('/intake-forms')
        const clients = clientsRes.data
        
        // New clients in the last 24 hours
        const newClients = clients.filter(client => {
          const createdAt = new Date(client.created_at)
          return client.status === 'new' && (now.getTime() - createdAt.getTime()) < 24 * 60 * 60 * 1000
        })
        
        newClients.forEach(client => {
          generatedNotifications.push({
            id: `new-client-${client.id}`,
            type: NotificationType.NEW_CLIENT,
            title: 'New Client Inquiry',
            message: `${client.contact_name} submitted an inquiry for ${formatEventType(client.event_type)}`,
            read: false,
            link: `/dashboard/clients/${client.id}`,
            clientId: client.id,
            createdAt: client.created_at,
          })
        })
      } catch (error) {
        console.error('Failed to fetch clients for notifications:', error)
      }

      // Fetch invoices for overdue payments
      try {
        const invoicesRes = await api.get<Invoice[]>('/invoices')
        const invoices = invoicesRes.data
        
        // Overdue invoices
        const overdueInvoices = invoices.filter(invoice => {
          const dueDate = new Date(invoice.due_date)
          return invoice.status === InvoiceStatus.OVERDUE || 
            (invoice.status === InvoiceStatus.SENT && dueDate < today)
        })
        
        overdueInvoices.forEach(invoice => {
          generatedNotifications.push({
            id: `invoice-overdue-${invoice.id}`,
            type: NotificationType.INVOICE_OVERDUE,
            title: 'Invoice Overdue',
            message: `Invoice ${invoice.invoice_number} is overdue ($${invoice.total_amount.toFixed(2)})`,
            read: false,
            link: `/dashboard/invoices/${invoice.id}`,
            createdAt: new Date().toISOString(),
          })
        })
      } catch (error) {
        console.error('Failed to fetch invoices for notifications:', error)
      }

      // Fetch contracts for signed notifications
      try {
        const contractsRes = await api.get<Contract[]>('/contracts')
        const contracts = contractsRes.data
        
        // Recently signed contracts (last 48 hours)
        const recentlySigned = contracts.filter(contract => {
          if (contract.status !== ContractStatus.SIGNED || !contract.signedDate) return false
          const signedDate = new Date(contract.signedDate)
          return (now.getTime() - signedDate.getTime()) < 48 * 60 * 60 * 1000
        })
        
        recentlySigned.forEach(contract => {
          generatedNotifications.push({
            id: `contract-signed-${contract.id}`,
            type: NotificationType.CONTRACT_SIGNED,
            title: 'Contract Signed',
            message: `Contract "${contract.title}" has been signed`,
            read: false,
            link: `/dashboard/contracts/${contract.id}`,
            createdAt: contract.signedDate || new Date().toISOString(),
          })
        })
      } catch (error) {
        console.error('Failed to fetch contracts for notifications:', error)
      }

      // Fetch bookings for recent payments
      try {
        const bookingsRes = await api.get<Booking[]>('/bookings')
        const bookings = bookingsRes.data
        
        // Recent bookings (last 48 hours)
        const recentBookings = bookings.filter(booking => {
          const createdAt = new Date(booking.createdAt)
          return (now.getTime() - createdAt.getTime()) < 48 * 60 * 60 * 1000
        })
        
        recentBookings.forEach(booking => {
          generatedNotifications.push({
            id: `new-booking-${booking.id}`,
            type: NotificationType.NEW_BOOKING,
            title: 'New Booking',
            message: `New booking created${booking.event?.name ? ` for "${booking.event.name}"` : ''} - $${booking.totalPrice.toFixed(2)}`,
            read: false,
            link: `/dashboard/bookings/${booking.id}`,
            bookingId: booking.id,
            booking: booking,
            createdAt: booking.createdAt,
          })
        })

        // Payment received (bookings with recent payments)
        const paidBookings = bookings.filter(booking => {
          return booking.totalAmountPaid > 0 && booking.paymentStatus === 'paid'
        })
        
        paidBookings.slice(0, 3).forEach(booking => {
          generatedNotifications.push({
            id: `payment-received-${booking.id}`,
            type: NotificationType.PAYMENT_RECEIVED,
            title: 'Payment Received',
            message: `Payment of $${booking.totalAmountPaid.toFixed(2)} received${booking.event?.name ? ` for "${booking.event.name}"` : ''}`,
            read: false,
            link: `/dashboard/bookings/${booking.id}`,
            bookingId: booking.id,
            booking: booking,
            createdAt: booking.updatedAt,
          })
        })
      } catch (error) {
        console.error('Failed to fetch bookings for notifications:', error)
      }

      // Sort notifications by date (newest first)
      generatedNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Load read status from localStorage
      const readIds = getReadNotificationIds()
      const notificationsWithReadStatus = generatedNotifications.map(n => ({
        ...n,
        read: readIds.includes(n.id)
      }))

      setNotifications(notificationsWithReadStatus)
    } catch (error) {
      console.error('Failed to generate notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const getReadNotificationIds = (): string[] => {
    try {
      const stored = localStorage.getItem('readNotifications')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const saveReadNotificationIds = (ids: string[]) => {
    try {
      localStorage.setItem('readNotifications', JSON.stringify(ids))
    } catch (error) {
      console.error('Failed to save read notifications:', error)
    }
  }

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    const readIds = getReadNotificationIds()
    if (!readIds.includes(id)) {
      saveReadNotificationIds([...readIds, id])
    }
  }, [])

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    saveReadNotificationIds(allIds)
  }, [notifications])

  const refreshNotifications = useCallback(async () => {
    await generateNotifications()
  }, [generateNotifications])

  // Fetch notifications on mount and every 5 minutes
  useEffect(() => {
    generateNotifications()
    
    const interval = setInterval(() => {
      generateNotifications()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [generateNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Helper function to format event type
function formatEventType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
