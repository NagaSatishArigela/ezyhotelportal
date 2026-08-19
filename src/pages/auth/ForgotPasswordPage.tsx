import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { EzyMark, EzyWordmark } from '@/components/brand/EzyLogo'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldWrapper } from '@/components/shared/FieldWrapper'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type ForgotForm = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: ForgotForm) => {
    await sleep(1000) // mock API call
    setSubmittedEmail(email)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-(--radius-xl) border border-border shadow-3 p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <EzyMark size={34} className="shrink-0" />
            <EzyWordmark className="font-display font-bold" />
          </div>

          {!sent ? (
            <>
              <h1 className="font-display font-bold text-2xl text-navy-900 mb-1">
                Forgot password?
              </h1>
              <p className="text-sm text-navy-500 mb-7">
                Enter your registered email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FieldWrapper label="Email address" error={errors.email?.message} required>
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    error={!!errors.email}
                  />
                </FieldWrapper>

                <Button type="submit" block loading={isSubmitting}>
                  Send reset link
                </Button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="flex h-16 w-16 mx-auto mb-5 items-center justify-center rounded-full bg-success-50">
                <CheckCircle size={32} className="text-success-500" aria-hidden />
              </div>
              <h2 className="font-display font-bold text-xl text-navy-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-navy-500 mb-1">
                We've sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-navy-900 mb-6">{submittedEmail}</p>
              <p className="text-xs text-navy-400 mb-6">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-primary-600 font-semibold hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-border">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-900 transition-colors"
            >
              <ArrowLeft size={14} aria-hidden />
              Back to sign in
            </Link>
          </div>
        </div>

        {/* Demo note */}
        <p className="text-center text-xs text-navy-400 mt-4">
          <Mail size={11} className="inline mr-1" aria-hidden />
          Demo mode — no real email will be sent
        </p>
      </div>
    </div>
  )
}
