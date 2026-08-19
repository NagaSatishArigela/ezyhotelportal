import { useState } from 'react'
import { Clock } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { useSessionExpiry } from '@/hooks/useSessionExpiry'
import { useNavigate } from '@tanstack/react-router'

export function SessionExpiryWarning() {
  const { refreshToken, setToken, setRefreshToken, logout } = useAuthStore()
  const [extending, setExtending] = useState(false)
  const navigate = useNavigate()
  // When the countdown hits 0 the token is dead — log out and redirect so the
  // UI can't linger in a fake-authenticated state.
  const { showWarning, secondsLeft, dismiss } = useSessionExpiry(() => {
    logout()
    navigate({ to: '/login' })
  })

  if (!showWarning) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const display = `${mins}:${String(secs).padStart(2, '0')}`
  const isUrgent = secondsLeft <= 15

  const handleExtend = async () => {
    if (!refreshToken) return
    setExtending(true)
    try {
      // Call refresh directly (not via api instance) to avoid re-entering the 401 interceptor
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh-token`,
        { refreshToken },
      )
      setToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      dismiss()
    } catch {
      // Refresh failed — session truly expired; logout and redirect
      logout()
      navigate({ to: '/login' })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-border">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 rounded-full bg-primary-50 p-2.5">
            <Clock className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-navy-900">Session expiring soon</p>
            <p className="text-sm text-navy-600 mt-0.5">
              Stay logged in to keep working without interruption.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center my-5">
          <span
            className={`text-6xl font-bold tabular-nums transition-colors ${
              isUrgent ? 'text-red-500' : 'text-primary-600'
            }`}
          >
            {display}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleExtend}
            disabled={extending}
            className="w-full rounded-[10px] bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {extending ? 'Extending session…' : 'Stay logged in'}
          </button>
          <button
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
