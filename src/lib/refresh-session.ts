import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

let pending: { token: string; promise: Promise<string> } | undefined
let cooldown: { token: string; userId: string; until: number } | undefined

export class RefreshRateLimitError extends Error {
  constructor(public readonly retryAt: number) {
    super('Session renewal is temporarily limited. We will retry automatically when the wait ends. Your form is still open.')
  }
}

export function refreshRetryAt(): number {
  const state = useAuthStore.getState()
  return cooldown?.token === state.refreshToken && cooldown?.userId === state.user?.id
    ? cooldown.until : 0
}

export function refreshFailureMessage(error: unknown): string {
  if (error instanceof RefreshRateLimitError) return error.message
  if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) {
    return 'The session service is temporarily unavailable. Please try again. Your form is still open.'
  }
  return 'Could not renew your session. Check your connection and retry. Your form is still open.'
}

function retryDelay(error: unknown): number {
  if (!axios.isAxiosError(error)) return 60_000
  const headers = error.response?.headers
  const delays = ['retry-after', 'retry-after-strict', 'retry-after-upload'].map(name => {
    const value = headers?.[name]
    if (value == null) return 0
    const seconds = Number(value)
    return Number.isFinite(seconds) ? seconds * 1000 : Date.parse(String(value)) - Date.now()
  }).filter(delay => Number.isFinite(delay) && delay > 0)
  return delays.length ? Math.max(...delays) : 60_000
}

/** All refresh callers share one rotation. Never overwrite a different login. */
export function refreshSession(): Promise<string> {
  const { refreshToken, user } = useAuthStore.getState()
  if (!refreshToken || !user) return Promise.reject(new Error('Please sign in again'))
  if (pending?.token === refreshToken) return pending.promise
  const until = refreshRetryAt()
  if (until > Date.now()) return Promise.reject(new RefreshRateLimitError(until))
  const entry = { token: refreshToken, promise: Promise.resolve('') }
  entry.promise = axios.post<{ accessToken: string; refreshToken: string }>(
    `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh-token`, { refreshToken }, { timeout: 15000 },
  ).then(({ data }) => {
    const state = useAuthStore.getState()
    if (state.user?.id !== user.id || state.refreshToken !== refreshToken) throw new Error('Session changed')
    if (!data.accessToken || !data.refreshToken) throw new Error('Invalid refresh response')
    useAuthStore.setState({ token: data.accessToken, refreshToken: data.refreshToken })
    cooldown = undefined
    return data.accessToken
  }).catch(error => {
    const state = useAuthStore.getState()
    if (error?.response?.status === 429 && state.user?.id === user.id && state.refreshToken === refreshToken) {
      const until = Date.now() + retryDelay(error)
      cooldown = { token: refreshToken, userId: user.id, until }
      throw new RefreshRateLimitError(until)
    }
    if ([401, 403].includes(error?.response?.status) && state.user?.id === user.id && state.refreshToken === refreshToken) state.logout()
    throw error
  }).finally(() => { if (pending === entry) pending = undefined })
  pending = entry
  return entry.promise
}
