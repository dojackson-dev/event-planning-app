'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ClientSession {
  clientId: string
  phone: string
  firstName: string
  lastName: string
}

interface ClientAuthContextType {
  client: ClientSession | null
  clientToken: string | null
  loading: boolean
  isClientAuthenticated: boolean
  requestOtp: (name: string, phone: string, agreedToSms: boolean, agreedToTerms: boolean) => Promise<{ devOtp?: string }>
  verifyOtp: (phone: string, code: string, name?: string) => Promise<void>
  clientLogout: () => void
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined)

const CLIENT_TOKEN_KEY = 'client_token'
const CLIENT_SESSION_KEY = 'client_session'

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientSession | null>(null)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem(CLIENT_TOKEN_KEY)
    const sessionStr = localStorage.getItem(CLIENT_SESSION_KEY)
    if (token && sessionStr) {
      try {
        const session = JSON.parse(sessionStr) as ClientSession
        setClientToken(token)
        setClient(session)
      } catch {
        localStorage.removeItem(CLIENT_TOKEN_KEY)
        localStorage.removeItem(CLIENT_SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  const requestOtp = async (
    name: string,
    phone: string,
    agreedToSms: boolean,
    agreedToTerms: boolean,
  ): Promise<{ devOtp?: string }> => {
    const res = await axios.post(`${API_URL}/client-portal/auth/request-otp`, {
      name,
      phone,
      agreedToSms,
      agreedToTerms,
    })
    return res.data
  }

  const verifyOtp = async (phone: string, code: string, name?: string): Promise<void> => {
    const res = await axios.post(`${API_URL}/client-portal/auth/verify-otp`, { phone, code, name })
    const { token, client: clientInfo } = res.data as { token: string; client: ClientSession }
    localStorage.setItem(CLIENT_TOKEN_KEY, token)
    localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(clientInfo))
    setClientToken(token)
    setClient(clientInfo)
    // Redirect to any pending page (e.g. vendor profile they were trying to book)
    const pendingRedirect = sessionStorage.getItem('post_login_redirect')
    if (pendingRedirect) {
      sessionStorage.removeItem('post_login_redirect')
      router.push(pendingRedirect)
    } else {
      router.push('/client-portal')
    }
  }

  const clientLogout = () => {
    const token = localStorage.getItem(CLIENT_TOKEN_KEY)
    if (token) {
      axios
        .post(`${API_URL}/client-portal/auth/logout`, {}, { headers: { 'x-client-token': token } })
        .catch(() => {})
    }
    localStorage.removeItem(CLIENT_TOKEN_KEY)
    localStorage.removeItem(CLIENT_SESSION_KEY)
    setClientToken(null)
    setClient(null)
    router.push('/client-login')
  }

  return (
    <ClientAuthContext.Provider
      value={{
        client,
        clientToken,
        loading,
        isClientAuthenticated: !!client && !!clientToken,
        requestOtp,
        verifyOtp,
        clientLogout,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  )
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext)
  if (!ctx) throw new Error('useClientAuth must be used within ClientAuthProvider')
  return ctx
}
