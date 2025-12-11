import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      // During debugging we avoid auto-logout which triggers a hard navigation
      // and clears the console. Enable automatic logout in production by
      // setting NEXT_PUBLIC_ENABLE_AUTO_LOGOUT=true in the frontend env.
      console.warn('API interceptor: 401 received', error.response)
      if (process.env.NEXT_PUBLIC_ENABLE_AUTO_LOGOUT === 'true') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
      // Otherwise, just reject so the app can handle/diagnose the error.
    }
    return Promise.reject(error)
  }
)

export default api
