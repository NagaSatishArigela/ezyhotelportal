import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { superAdminApi, type AdminUser } from '@/lib/api/superAdminApi'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldWrapper } from '@/components/shared/FieldWrapper'

const createSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(120),
  phone: z.string().regex(/^\d{10}$/, 'Exactly 10 digits'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
})
type CreateForm = z.infer<typeof createSchema>

function RoleBadge({ role }: { role: AdminUser['globalRole'] }) {
  return (
    <Badge variant={role === 'SUPER_ADMIN' ? 'dark' : 'grey'}>
      {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
    </Badge>
  )
}

function StatusBadge({ status }: { status: AdminUser['status'] }) {
  return (
    <Badge variant={status === 'active' ? 'green' : 'red'}>
      {status === 'active' ? 'Active' : 'Suspended'}
    </Badge>
  )
}

export function SuperAdminAdminsPage() {
  const [page] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-admins', page],
    queryFn: () => superAdminApi.listAdmins(page, 20),
  })

  const create = useMutation({
    mutationFn: (payload: CreateForm) =>
      superAdminApi.createAdmin({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || undefined,
      }),
    onSuccess: () => {
      toast.success('Admin account created')
      setCreateOpen(false)
      qc.invalidateQueries({ queryKey: ['super-admin-admins'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create admin'),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminUser['status'] }) =>
      superAdminApi.toggleStatus(id, status),
    onSuccess: (updated) => {
      toast.success(`Account ${updated.status === 'active' ? 'activated' : 'suspended'}`)
      qc.invalidateQueries({ queryKey: ['super-admin-admins'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Action failed'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const onSubmit = (data: CreateForm) => create.mutate(data)

  const isSelf = (id: string) => id === currentUser?.id

  return (
    <div className="space-y-6" data-testid="super-admin-admins-page">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Admin Users</h1>
          <p className="mt-1 text-sm text-navy-500">Manage admin and super admin accounts</p>
        </div>
        <Button size="sm" onClick={() => { reset(); setCreateOpen(true) }} data-testid="create-admin-btn">
          <Plus size={14} aria-hidden /> Create admin
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-navy-100" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-sm text-left">
            <caption className="sr-only">Admin users</caption>
            <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wider text-navy-500">
              <tr>
                {['Name / Phone', 'Email', 'Role', 'Status', 'Created', ''].map((h) => (
                  <th key={h || 'actions'} scope="col" className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.items.map((admin) => {
                const self = isSelf(admin.id)
                const isSuper = admin.globalRole === 'SUPER_ADMIN'
                const canToggle = !self && !isSuper

                return (
                  <tr key={admin.id} className="hover:bg-navy-50" data-testid="admin-row">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-navy-900">{admin.name ?? '—'}</p>
                      <p className="text-xs text-navy-400 font-mono">{admin.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-navy-600">{admin.email}</td>
                    <td className="px-4 py-4"><RoleBadge role={admin.globalRole} /></td>
                    <td className="px-4 py-4"><StatusBadge status={admin.status} /></td>
                    <td className="px-4 py-4 text-navy-500">
                      {new Date(admin.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {canToggle && (
                        admin.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error-600 hover:text-error-700"
                            onClick={() => toggleStatus.mutate({ id: admin.id, status: 'suspended' })}
                            disabled={toggleStatus.isPending}
                            data-testid="suspend-btn"
                            aria-label={`Suspend ${admin.name}`}
                          >
                            <ShieldAlert size={14} aria-hidden /> Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success-600 hover:text-success-700"
                            onClick={() => toggleStatus.mutate({ id: admin.id, status: 'active' })}
                            disabled={toggleStatus.isPending}
                            data-testid="activate-btn"
                            aria-label={`Activate ${admin.name}`}
                          >
                            <ShieldCheck size={14} aria-hidden /> Activate
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Admin Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create admin account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FieldWrapper label="Full name" error={errors.name?.message} required>
              <Input {...register('name')} placeholder="Ankit Verma" data-testid="name-input" />
            </FieldWrapper>
            <FieldWrapper label="Phone (10 digits)" error={errors.phone?.message} required>
              <Input {...register('phone')} placeholder="9988776655" data-testid="phone-input" />
            </FieldWrapper>
            <FieldWrapper label="Email (optional)" error={errors.email?.message}>
              <Input {...register('email')} type="email" placeholder="admin@stayflex.in" data-testid="email-input" />
            </FieldWrapper>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending} data-testid="confirm-create-btn">
                {create.isPending ? 'Creating…' : 'Create admin'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
