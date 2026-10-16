import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSessionExpiry } from '@/hooks/useSessionExpiry'
import { useNavigate } from '@tanstack/react-router'

export function SessionExpiryWarning() {
  const { logout } = useAuthStore()
  const [extending, setExtending] = useState(false)
  const navigate = useNavigate()
  // Access-token expiry remains recoverable while the refresh session is valid.
  const { showWarning, secondsLeft, retrySeconds, error, extend, dismiss } = useSessionExpiry(() => {
    logout()
    navigate({ to: '/login' })
  })

  if (!showWarning) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const display = `${mins}:${String(secs).padStart(2, '0')}`
  const isUrgent = secondsLeft <= 15

  const handleExtend = async () => {
    if (extending || retrySeconds > 0) return
    setExtending(true)
    try {
      await extend()
    } finally {
      setExtending(false)
    }
  }

  const handleLogout = () => {
    dismiss()
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="session-warning-title" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-border">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 rounded-full bg-primary-50 p-2.5">
            <Clock className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p id="session-warning-title" className="font-semibold text-navy-900">{secondsLeft > 0 ? 'Session expiring soon' : 'Session renewal interrupted'}</p>
            <p className="text-sm text-navy-600 mt-0.5">
              Stay logged in to keep working without interruption.
            </p>
          </div>
        </div>

        {secondsLeft > 0 && <div className="flex items-center justify-center my-5">
          <span
            className={`text-6xl font-bold tabular-nums transition-colors ${
              isUrgent ? 'text-red-500' : 'text-primary-600'
            }`}
          >
            {display}
          </span>
        </div>}

        <div className="flex flex-col gap-2">
          {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
          <button
            type="button"
            onClick={handleExtend}
            disabled={extending || retrySeconds > 0}
            className="w-full rounded-[10px] bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {extending ? 'Extending session…' : retrySeconds > 0 ? `Retrying in ${retrySeconds}s` : 'Stay logged in'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-[10px] border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy-600 hover:bg-navy-50 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
