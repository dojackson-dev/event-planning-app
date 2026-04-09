import axios from 'axios'

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
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
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
          return new Promise((resolve) => {
            subscribeTokenRefresh((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(api(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
          const { access_token, refresh_token: newRefreshToken } = res.data

          localStorage.setItem('access_token', access_token)
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken)
          }

          api.defaults.headers.common.Authorization = `Bearer ${access_token}`
          originalRequest.headers.Authorization = `Bearer ${access_token}`

          onRefreshed(access_token)
          isRefreshing = false

          return api(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          refreshSubscribers = []
          // Refresh failed - clear ALL auth storage and redirect to appropriate login
          const isAffiliate = !!localStorage.getItem('affiliate_data')
          ;['access_token','refresh_token','user','user_roles','active_role','user_role',
            'affiliate_token','affiliate_refresh_token','affiliate_data'].forEach(k => localStorage.removeItem(k))
          window.location.href = isAffiliate ? '/sales-portal/login' : '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token - redirect to appropriate login
        console.warn('API interceptor: 401 received, no refresh token', error.response)
        const isAffiliate = !!localStorage.getItem('affiliate_data')
        ;['access_token','refresh_token','user','user_roles','active_role','user_role',
          'affiliate_token','affiliate_refresh_token','affiliate_data'].forEach(k => localStorage.removeItem(k))
        window.location.href = isAffiliate ? '/sales-portal/login' : '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
