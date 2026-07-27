/**
 * Shared token refresh logic with deduplication.
 * Both AuthContext and the axios interceptor use this so only ONE
 * /auth/refresh call is ever in-flight at a time (Supabase tokens are single-use).
 */
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

let _refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null

export async function performTokenRefresh(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  if (_refreshPromise) {
    return _refreshPromise
  }

  _refreshPromise = axios
    .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
    .then((res) => {
      const { access_token, refresh_token: newRefreshToken } = res.data
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token)
        if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken)
      }
      return res.data as { access_token: string; refresh_token: string }
    })
    .finally(() => {
      _refreshPromise = null
    })

  return _refreshPromise
}
