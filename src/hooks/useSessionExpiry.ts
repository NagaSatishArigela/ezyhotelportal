import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { decodeToken } from '@/lib/token'
import { refreshFailureMessage, refreshRetryAt, refreshSession } from '@/lib/refresh-session'

export function useSessionExpiry(onExpire?: () => void) {
  const token = useAuthStore(s => s.token)
  const authenticated = useAuthStore(s => s.isAuthenticated)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const [error, setError] = useState('')
  const nextAutomaticRetry = useRef(0)
  const callback = useRef(onExpire)
  callback.current = onExpire
  const extend = useCallback(async () => {
    const startingToken = useAuthStore.getState().refreshToken
    try {
      await refreshSession()
      setShowWarning(false)
      setError('')
      setRetrySeconds(0)
      nextAutomaticRetry.current = 0
      return true
    } catch (failure) {
      const state = useAuthStore.getState()
      if (!state.isAuthenticated) {
        callback.current?.()
        return false
      }
      // A response from an old session must not affect a newer login.
      if (state.refreshToken !== startingToken) return false
      setShowWarning(true)
      setError(refreshFailureMessage(failure))
      const retryAt = refreshRetryAt()
      setRetrySeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))
      nextAutomaticRetry.current = Math.max(retryAt, Date.now() + 15000)
      return false
    }
  }, [])
  useEffect(() => {
    setShowWarning(false)
    setError('')
    nextAutomaticRetry.current = 0
    if (!authenticated || !token) return
    const payload = decodeToken(token)
    if (!payload) return
    let active = true
    let refreshing = false
    let notified = false
    const expire = () => { if (!notified) { notified = true; callback.current?.() } }
    const tick = async () => {
      if (!active) return
      const remaining = Math.max(0, Math.ceil(payload.exp - Date.now() / 1000))
      setSecondsLeft(remaining)
      const retryAt = refreshRetryAt()
      setRetrySeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))
      if (remaining > 60 || refreshing || Date.now() < Math.max(nextAutomaticRetry.current, retryAt)) return
      if (!useAuthStore.getState().refreshToken) {
        setShowWarning(true)
        if (!remaining) expire()
        return
      }
      refreshing = true
      try { await extend() } finally { refreshing = false }
    }
    const resume = () => { void tick() }
    void tick()
    const timer = setInterval(resume, 1000)
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', resume); window.removeEventListener('online', resume) }
  }, [token, authenticated, extend])
  return { showWarning, secondsLeft, retrySeconds, error, extend, dismiss: () => setShowWarning(false) }
}
