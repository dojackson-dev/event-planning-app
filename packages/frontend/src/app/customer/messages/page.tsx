'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Message } from '@/types'
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  MoreVertical, 
  Phone, 
  Video,
  Info,
  CheckCheck,
  Clock,
  AlertCircle,
  Search,
  MessageSquare,
  User
} from 'lucide-react'

interface Conversation {
  id: string
  name: string
  role: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  online: boolean
}

interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  isOwn: boolean
}

export default function CustomerMessagesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      // In a real app, this would fetch from API
      // For now, we'll create mock conversations
      setConversations([
        {
          id: '1',
          name: 'DoVenue Support',
          role: 'Event Coordinator',
          lastMessage: 'Your event is confirmed for March 15th!',
          lastMessageTime: '10:30 AM',
          unreadCount: 2,
          online: true
        },
        {
          id: '2',
          name: 'Sarah Martinez',
          role: 'Catering Manager',
          lastMessage: 'I\'ve sent over the updated menu options.',
          lastMessageTime: 'Yesterday',
          unreadCount: 0,
          online: false
        },
        {
          id: '3',
          name: 'Mike Johnson',
          role: 'Event Manager',
          lastMessage: 'The sound system is all set up!',
          lastMessageTime: '2 days ago',
          unreadCount: 0,
          online: true
        }
      ])
      
      // Auto-select first conversation
      setSelectedConversation({
        id: '1',
        name: 'DoVenue Support',
        role: 'Event Coordinator',
        lastMessage: 'Your event is confirmed for March 15th!',
        lastMessageTime: '10:30 AM',
        unreadCount: 2,
        online: true
      })
      
      // Load initial messages for first conversation
      setMessages([
        {
          id: '1',
          content: 'Hi! I wanted to check on the status of my booking for March 15th.',
          senderId: user?.id || 'customer',
          senderName: user?.firstName || 'Me',
          timestamp: '10:00 AM',
          status: 'read',
          isOwn: true
        },
        {
          id: '2',
          content: 'Hello! Thanks for reaching out. Let me check on that for you.',
          senderId: 'coordinator',
          senderName: 'DoVenue Support',
          timestamp: '10:15 AM',
          status: 'read',
          isOwn: false
        },
        {
          id: '3',
          content: 'Your event is confirmed for March 15th! Everything looks great. The Grand Ballroom is reserved from 6 PM to 11 PM.',
          senderId: 'coordinator',
          senderName: 'DoVenue Support',
          timestamp: '10:30 AM',
          status: 'read',
          isOwn: false
        },
        {
          id: '4',
          content: 'We\'ll also have the sound system and catering team ready as requested. Is there anything else you need?',
          senderId: 'coordinator',
          senderName: 'DoVenue Support',
          timestamp: '10:30 AM',
          status: 'delivered',
          isOwn: false
        }
      ])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return
    
    setSending(true)
    
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      senderId: user?.id || 'customer',
      senderName: user?.firstName || 'Me',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'sent',
      isOwn: true
    }
    
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    
    try {
      // In a real app, this would send to API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update message status to delivered
      setMessages(prev => 
        prev.map(m => 
          m.id === tempMessage.id 
            ? { ...m, status: 'delivered' as const }
            : m
        )
      )
    } catch (error) {
      // Update message status to failed
      setMessages(prev => 
        prev.map(m => 
          m.id === tempMessage.id 
            ? { ...m, status: 'failed' as const }
            : m
        )
      )
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read': return <CheckCheck className="w-4 h-4 text-blue-500" />
      case 'delivered': return <CheckCheck className="w-4 h-4 text-gray-400" />
      case 'sent': return <Clock className="w-4 h-4 text-gray-400" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">Chat with the venue team about your events</p>
      </div>
      
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex">
        {/* Conversations Sidebar */}
        <div className="w-full sm:w-80 border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations found
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedConversation?.id === conv.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                      {conv.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-gray-500">{conv.role}</p>
                    <p className="text-sm text-gray-600 truncate mt-1">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col hidden sm:flex">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                      {selectedConversation.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {selectedConversation.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.name}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.online ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        selectedConversation.role
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${message.isOwn ? 'order-2' : 'order-1'}`}>
                      {!message.isOwn && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          message.isOwn
                            ? 'bg-primary-600 text-white rounded-tr-sm'
                            : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                        {message.isOwn && getStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-3">
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
