import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { decodeToken } from '@/lib/token'
import { refreshSession } from '@/lib/refresh-session'

export function useSessionExpiry(onExpire?: () => void) {
  const token = useAuthStore(s => s.token)
  const authenticated = useAuthStore(s => s.isAuthenticated)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const callback = useRef(onExpire)
  callback.current = onExpire
  useEffect(() => {
    setShowWarning(false)
    if (!authenticated || !token) return
    const payload = decodeToken(token)
    if (!payload) return
    let active = true
    let retryAt = 0
    let refreshing = false
    let notified = false
    const expire = () => { if (!notified) { notified = true; callback.current?.() } }
    const tick = async () => {
      const remaining = Math.max(0, Math.ceil(payload.exp - Date.now() / 1000))
      setSecondsLeft(remaining)
      if (remaining > 60 || refreshing || Date.now() < retryAt) return
      if (!useAuthStore.getState().refreshToken) {
        setShowWarning(true)
        if (!remaining) expire()
        return
      }
      refreshing = true
      try { await refreshSession(); if (active) setShowWarning(false) }
      catch {
        if (!active) return
        if (!useAuthStore.getState().isAuthenticated) expire()
        else { setShowWarning(true); retryAt = Date.now() + 15000 }
      } finally { refreshing = false }
    }
    const resume = () => { void tick() }
    void tick()
    const timer = setInterval(resume, 1000)
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', resume); window.removeEventListener('online', resume) }
  }, [token, authenticated])
  return { showWarning, secondsLeft, dismiss: () => setShowWarning(false) }
}
