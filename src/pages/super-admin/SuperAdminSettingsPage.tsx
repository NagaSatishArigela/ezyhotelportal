import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { superAdminApi, type UpdateSettingsPayload } from '@/lib/api/superAdminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/shared/SectionCard'
import { FieldWrapper } from '@/components/shared/FieldWrapper'
import { Skeleton } from '@/components/ui/skeleton'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const settingsSchema = z.object({
  commissionPct: z.number({ error: 'Required' }).min(0, 'Min 0%').max(30, 'Max 30%'),
  payoutDayOfWeek: z.number().int().min(0, 'Must be 0–6').max(6, 'Must be 0–6'),
  minBookingHours: z.number({ error: 'Required' }).int().min(1, 'Min 1 hour').max(4, 'Max 4 hours'),
  maxBookingHours: z.number({ error: 'Required' }).int().min(8, 'Min 8 hours').max(48, 'Max 48 hours'),
  cancellationWindowHours: z.number({ error: 'Required' }).int().min(0, 'Min 0 hours').max(72, 'Max 72 hours'),
})
type SettingsForm = z.infer<typeof settingsSchema>

export function SuperAdminSettingsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-settings'],
    queryFn: superAdminApi.getSettings,
    staleTime: 60_000,
  })

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    if (data) {
      reset({
        commissionPct: Number(data.commissionPct),
        payoutDayOfWeek: data.payoutDayOfWeek,
        minBookingHours: data.minBookingHours,
        maxBookingHours: data.maxBookingHours,
        cancellationWindowHours: data.cancellationWindowHours,
      })
    }
  }, [data, reset])

  const save = useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => superAdminApi.updateSettings(payload),
    onSuccess: (updated) => {
      toast.success('Settings saved')
      qc.setQueryData(['super-admin-settings'], updated)
      reset({
        commissionPct: Number(updated.commissionPct),
        payoutDayOfWeek: updated.payoutDayOfWeek,
        minBookingHours: updated.minBookingHours,
        maxBookingHours: updated.maxBookingHours,
        cancellationWindowHours: updated.cancellationWindowHours,
      })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save settings'),
  })

  const onSubmit = (values: SettingsForm) => save.mutate(values)

  return (
    <div className="space-y-6" data-testid="super-admin-settings-page">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-navy-500">Configure global platform parameters</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <SectionCard title="Revenue & Payouts" subtitle="Commission and payout schedule">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrapper
                label="Commission %"
                hint="Platform cut taken from each booking (0–30)"
                error={errors.commissionPct?.message}
                required
              >
                <Input
                  {...register('commissionPct', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  max={30}
                  data-testid="commission-pct-input"
                />
              </FieldWrapper>

              <FieldWrapper
                label="Payout day of week"
                hint={`0 = Sunday … 6 = Saturday (currently: ${data ? DOW_LABELS[data.payoutDayOfWeek] : '—'})`}
                error={errors.payoutDayOfWeek?.message}
                required
              >
                <Input
                  {...register('payoutDayOfWeek', { valueAsNumber: true })}
                  type="number"
                  step={1}
                  min={0}
                  max={6}
                  data-testid="payout-day-input"
                />
              </FieldWrapper>
            </div>
          </SectionCard>

          <SectionCard title="Booking Rules" subtitle="Minimum, maximum, and cancellation window">
            <div className="grid gap-5 sm:grid-cols-3">
              <FieldWrapper
                label="Min booking hours"
                hint="1–4"
                error={errors.minBookingHours?.message}
                required
              >
                <Input
                  {...register('minBookingHours', { valueAsNumber: true })}
                  type="number"
                  step={1}
                  min={1}
                  max={4}
                  data-testid="min-hours-input"
                />
              </FieldWrapper>

              <FieldWrapper
                label="Max booking hours"
                hint="8–48"
                error={errors.maxBookingHours?.message}
                required
              >
                <Input
                  {...register('maxBookingHours', { valueAsNumber: true })}
                  type="number"
                  step={1}
                  min={8}
                  max={48}
                  data-testid="max-hours-input"
                />
              </FieldWrapper>

              <FieldWrapper
                label="Cancellation window (hrs)"
                hint="0–72 hours before check-in"
                error={errors.cancellationWindowHours?.message}
                required
              >
                <Input
                  {...register('cancellationWindowHours', { valueAsNumber: true })}
                  type="number"
                  step={1}
                  min={0}
                  max={72}
                  data-testid="cancellation-window-input"
                />
              </FieldWrapper>
            </div>
          </SectionCard>

          {data && (
            <p className="text-xs text-navy-400">
              Last updated:{' '}
              {new Date(data.updatedAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isDirty || save.isPending}
              data-testid="save-settings-btn"
            >
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
