import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
export function VerifyEmail() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  async function send(confirm: boolean) {
    setBusy(true); setMessage('')
    try {
      const { data } = await api.post('/auth/email-verification/' + (confirm ? 'confirm' : 'request'), confirm ? { code: code.trim() } : {})
      setVerified(data.verified)
      setMessage(data.verified ? 'Email verified. Your hotel owner can now assign your role.' : 'Check your email and paste the verification code below. It expires in 15 minutes.')
      if (data.verified) setCode('')
    } catch { setMessage('Unable to verify email. Check your code or try again. If delivery is unavailable, contact platform support.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-lg border p-4 space-y-3">
    <h2 className="font-semibold">Verify email for hotel team access</h2>
    <p>Before an owner assigns a hotel role, verify the email on your account.</p>
    {!verified && <><Button disabled={busy} onClick={() => void send(false)}>Send verification email</Button>
    <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void send(true) }}>
      <Input aria-label="Email verification code" value={code} onChange={e => setCode(e.target.value)} required pattern="[a-f0-9]{64}" maxLength={64} />
      <Button disabled={busy || !code.trim()} type="submit">Verify email</Button>
    </form></>}
    {message && <p role="status">{message}</p>}
  </section>
}
