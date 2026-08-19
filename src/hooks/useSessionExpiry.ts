import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { decodeToken } from '@/lib/token'

const WARNING_THRESHOLD_SEC = 60

/**
 * Drives the session-expiry countdown modal. When the countdown reaches 0 the
 * session is over: `onExpire` fires exactly once so the caller can log the user
 * out and redirect to /login (otherwise the modal would just vanish, leaving an
 * authenticated-looking UI backed by a dead token).
 */
export function useSessionExpiry(onExpire?: () => void) {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_THRESHOLD_SEC)
  const [expired, setExpired] = useState(false)

  // Keep the latest callback without re-arming the timers when it changes.
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setShowWarning(false)
    setExpired(false)

    if (!isAuthenticated || !token) return

    const payload = decodeToken(token)
    if (!payload) return

    const expiresInSec = payload.exp - Date.now() / 1000
    if (expiresInSec <= 0) return

    // Use a local object so cleanup captures the same reference across both timers
    const ids: {
      warning?: ReturnType<typeof setTimeout>
      countdown?: ReturnType<typeof setInterval>
    } = {}

    const startCountdown = (initial: number) => {
      setSecondsLeft(initial)
      setShowWarning(true)
      ids.countdown = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(ids.countdown)
            setShowWarning(false)
            setExpired(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    if (expiresInSec <= WARNING_THRESHOLD_SEC) {
      // Already inside the warning window — show immediately
      startCountdown(Math.floor(expiresInSec))
    } else {
      ids.warning = setTimeout(
        () => startCountdown(WARNING_THRESHOLD_SEC),
        (expiresInSec - WARNING_THRESHOLD_SEC) * 1000,
      )
    }

    return () => {
      clearTimeout(ids.warning)
      clearInterval(ids.countdown)
    }
  }, [token, isAuthenticated])

  // Fire the expiry callback once, in an effect (not inside the setState updater
  // which can run twice under StrictMode).
  useEffect(() => {
    if (expired) onExpireRef.current?.()
  }, [expired])

  const dismiss = () => setShowWarning(false)

  return { showWarning, secondsLeft, dismiss }
}
