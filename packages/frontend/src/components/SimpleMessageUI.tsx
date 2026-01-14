'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  isOwn: boolean
}

interface SimpleMessageUIProps {
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
  currentUserId: string
  currentUserName: string
  placeholder?: string
  className?: string
}

export default function SimpleMessageUI({
  messages,
  onSendMessage,
  currentUserId,
  currentUserName,
  placeholder = 'Type your message...',
  className = '',
}: SimpleMessageUIProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(newMessage.trim())
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'sent':
        return <CheckCircle className="h-3 w-3 text-gray-400" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'pending':
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Send className="h-12 w-12 mb-4 text-gray-300" />
            <p>No messages yet</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.isOwn
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {!message.isOwn && (
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      {message.senderName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    message.isOwn ? 'text-primary-200' : 'text-gray-500'
                  }`}>
                    <span className="text-xs">{formatTime(message.timestamp)}</span>
                    {message.isOwn && getStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none max-h-32"
              rows={1}
              style={{
                minHeight: '48px',
                height: 'auto',
              }}
            />
            <button
              type="button"
              className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600"
              title="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send className={`h-5 w-5 ${sending ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
