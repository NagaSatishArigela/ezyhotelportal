import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { decodeToken } from '@/lib/token'

const WARNING_THRESHOLD_SEC = 60

export function useSessionExpiry() {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_THRESHOLD_SEC)

  useEffect(() => {
    setShowWarning(false)

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

  const dismiss = () => setShowWarning(false)

  return { showWarning, secondsLeft, dismiss }
}
