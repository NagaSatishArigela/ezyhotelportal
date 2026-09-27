import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

let pending: { token: string; promise: Promise<string> } | undefined

/** All refresh callers share one rotation. Never overwrite a different login. */
export function refreshSession(): Promise<string> {
  const { refreshToken, user } = useAuthStore.getState()
  if (!refreshToken || !user) return Promise.reject(new Error('Please sign in again'))
  if (pending?.token === refreshToken) return pending.promise
  const entry = { token: refreshToken, promise: Promise.resolve('') }
  entry.promise = axios.post<{ accessToken: string; refreshToken: string }>(
    `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh-token`, { refreshToken }, { timeout: 15000 },
  ).then(({ data }) => {
    const state = useAuthStore.getState()
    if (state.user?.id !== user.id || state.refreshToken !== refreshToken) throw new Error('Session changed')
    if (!data.accessToken || !data.refreshToken) throw new Error('Invalid refresh response')
    useAuthStore.setState({ token: data.accessToken, refreshToken: data.refreshToken })
    return data.accessToken
  }).catch(error => {
    const state = useAuthStore.getState()
    if ([401, 403].includes(error?.response?.status) && state.user?.id === user.id && state.refreshToken === refreshToken) state.logout()
    throw error
  }).finally(() => { if (pending === entry) pending = undefined })
  pending = entry
  return entry.promise
}
