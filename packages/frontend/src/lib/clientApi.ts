import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const clientApi = axios.create({
  baseURL: `${API_URL}/client-portal`,
  headers: { 'Content-Type': 'application/json' },
})

clientApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('client_token')
    if (token) {
      config.headers['x-client-token'] = token
    }
  }
  return config
})

clientApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Save the current URL so the user returns here after re-logging in
      const currentUrl = window.location.pathname + window.location.search
      if (currentUrl && currentUrl !== '/client-login') {
        sessionStorage.setItem('post_login_redirect', currentUrl)
      }
      localStorage.removeItem('client_token')
      localStorage.removeItem('client_session')
      window.location.href = '/client-login'
    }
    return Promise.reject(err)
  },
)

export default clientApi
