import axios from 'axios'
import { performTokenRefresh } from './refreshAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

let isRefreshing = false
let refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

function subscribeTokenRefresh(resolve: (token: string) => void, reject: (err: any) => void) {
  refreshSubscribers.push({ resolve, reject })
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token))
  refreshSubscribers = []
  isRefreshing = false
}

function onRefreshFailed(err: any) {
  refreshSubscribers.forEach(({ reject }) => reject(err))
  refreshSubscribers = []
  isRefreshing = false
}

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        if (isRefreshing) {
          // Queue the request until refresh is done
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh(
              (newToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                resolve(api(originalRequest))
              },
              (err) => reject(err)
            )
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const { access_token } = await performTokenRefresh(refreshToken)

          api.defaults.headers.common.Authorization = `Bearer ${access_token}`
          originalRequest.headers.Authorization = `Bearer ${access_token}`

          onRefreshed(access_token)

          return api(originalRequest)
        } catch (refreshError: any) {
          onRefreshFailed(refreshError)
          // Only force logout on actual auth rejections, not network errors
          const status = (refreshError as any)?.response?.status
          if (status === 401 || status === 403) {
            const isAffiliate = !!localStorage.getItem('affiliate_data')
            const isVendor = localStorage.getItem('user_role') === 'vendor'
            const isPromoter = localStorage.getItem('user_role') === 'promoter'
            ;['access_token','refresh_token','user','user_roles','active_role','user_role',
              'affiliate_token','affiliate_refresh_token','affiliate_data'].forEach(k => localStorage.removeItem(k))
            window.location.href = isAffiliate ? '/sales-portal/login' : isPromoter ? '/promoter/login' : isVendor ? '/vendors/login' : '/login'
          }
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token - redirect to appropriate login
        console.warn('API interceptor: 401 received, no refresh token', error.response)
        const isAffiliate = !!localStorage.getItem('affiliate_data')
        const isVendor = localStorage.getItem('user_role') === 'vendor'
        const isPromoter = localStorage.getItem('user_role') === 'promoter'
        ;['access_token','refresh_token','user','user_roles','active_role','user_role',
          'affiliate_token','affiliate_refresh_token','affiliate_data'].forEach(k => localStorage.removeItem(k))
        window.location.href = isAffiliate ? '/sales-portal/login' : isPromoter ? '/promoter/login' : isVendor ? '/vendors/login' : '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
