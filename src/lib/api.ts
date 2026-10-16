import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { refreshSession } from './refresh-session'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api', timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Request-ID'] = crypto.randomUUID()
  return config
})
api.interceptors.response.use(res => res, async error => {
  const original = error.config
  if (error.response?.status !== 401 || !original || original._retried || original.url?.startsWith('/auth/')) throw error
  const state = useAuthStore.getState()
  if (!state.refreshToken) throw error
  original._retried = true
  // A delayed 401 may arrive after another request already renewed the token.
  const token = state.token && original.headers.Authorization !== `Bearer ${state.token}`
    ? state.token : await refreshSession()
  original.headers.Authorization = `Bearer ${token}`
  return api(original)
})
