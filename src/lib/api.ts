import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT + request ID on every outgoing request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  // Propagate request ID for backend log correlation (E16)
  config.headers['X-Request-ID'] = crypto.randomUUID()
  return config
})

let isRefreshing = false
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function flushQueue(token: string) {
  refreshQueue.forEach(({ resolve }) => resolve(token))
  refreshQueue = []
}

function rejectQueue(error: unknown) {
  refreshQueue.forEach(({ reject }) => reject(error))
  refreshQueue = []
}

// 401 interceptor: attempt one silent refresh before forcing logout (E3)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status !== 401 || original._retried) {
      return Promise.reject(err)
    }

    const { refreshToken, setToken, setRefreshToken, logout } = useAuthStore.getState()
    if (!refreshToken) {
      // No refresh token (e.g. demo/mock auth) — let the mutation's onError
      // handler show a toast rather than force-logging the user out.
      return Promise.reject(err)
    }

    if (isRefreshing) {
      // Queue concurrent requests until the refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    isRefreshing = true
    original._retried = true
    try {
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh-token`,
        { refreshToken },
      )
      setToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      flushQueue(data.accessToken)
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (refreshError) {
      rejectQueue(refreshError)
      logout()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)
