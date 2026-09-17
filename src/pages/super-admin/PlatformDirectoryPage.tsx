import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiMessage } from '@/lib/api/hotelTeam'
import { useAuthStore } from '@/store/auth.store'
import { HotelTeamPage } from '@/pages/owner/HotelTeamPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
interface PlatformUser {
  id: string
  name: string | null
  email: string
  phone: string
  globalRole: string
  status: string
  propertyRoles: { propertyId: string; role: string }[]
}
interface PlatformHotel {
  id: string
  name: string
  city: string | null
  status: string
  ownerId: string
  owner?: { name: string | null; email: string }
}
const userSchema = z.object({
  globalRole: z.enum(['USER', 'ADMIN', 'SUPPORT', 'SUPER_ADMIN']),
  status: z.enum(['active', 'suspended', 'deleted']),
})
function UserEditor({ user, close }: { user: PlatformUser; close: () => void }) {
  const qc = useQueryClient()
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      globalRole: user.globalRole as z.infer<typeof userSchema>['globalRole'],
      status: user.status as z.infer<typeof userSchema>['status'],
    },
  })
  const save = useMutation({
    mutationFn: (v: z.infer<typeof userSchema>) => api.patch('/super-admin/users/' + user.id, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform-directory'] })
      toast.success('User updated')
      close()
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
  return (
    <form
      className="border rounded-lg p-4 space-y-3"
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
    >
      <h2 className="font-semibold">Manage {user.email}</h2>
      <p>Platform roles grant access across all hotels. Hotel staff should remain USER.</p>
      <label>
        Platform role
        <select
          aria-label="Platform role"
          className="border p-2 block"
          {...form.register('globalRole')}
        >
          {['USER', 'ADMIN', 'SUPPORT', 'SUPER_ADMIN'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        Account status
        <select
          aria-label="Account status"
          className="border p-2 block"
          {...form.register('status')}
        >
          {['active', 'suspended', 'deleted'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <Button disabled={save.isPending}>Save user</Button>
      <Button type="button" variant="outline" onClick={close}>
        Cancel
      </Button>
    </form>
  )
}
export function PlatformDirectoryPage({ kind }: { kind: 'users' | 'properties' }) {
  const currentId = useAuthStore((s) => s.user?.id)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<PlatformUser | null>(null)
  const [hotel, setHotel] = useState<PlatformHotel | null>(null)
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['platform-directory', kind, q, page],
    queryFn: async () =>
      (
        await api.get<{ items: (PlatformUser | PlatformHotel)[]; total: number }>(
          '/super-admin/' + kind,
          { params: { q, page, limit: 20 } }
        )
      ).data,
  })
  const suspend = useMutation({
    mutationFn: (h: PlatformHotel) =>
      api.patch('/super-admin/properties/' + h.id + '/status', {
        suspended: h.status === 'approved',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform-directory'] })
      toast.success('Hotel status updated')
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">
        {kind === 'users' ? 'All platform users' : 'All hotels and applicants'}
      </h1>
      <Input
        aria-label="Search directory"
        placeholder="Search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setPage(1)
        }}
      />
      {isLoading && <p>Loading...</p>}
      {isError && <p role="alert">Unable to load directory.</p>}
      {editing && <UserEditor key={editing.id} user={editing} close={() => setEditing(null)} />}
      {hotel && (
        <section className="border p-4">
          <h2>{hotel.name}</h2>
          <Button variant="outline" onClick={() => setHotel(null)}>
            Close team
          </Button>
          <HotelTeamPage key={hotel.id} propertyId={hotel.id} />
        </section>
      )}
      <div className="overflow-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>{kind === 'users' ? 'User' : 'Hotel'}</th>
              <th>{kind === 'users' ? 'Platform / hotel roles' : 'Owner'}</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => {
              if (kind === 'users') {
                const u = item as PlatformUser
                return (
                  <tr key={u.id}>
                    <td className="py-3">
                      {u.name ?? u.email}
                      <p>
                        {u.email} - {u.phone}
                      </p>
                    </td>
                    <td>
                      {u.globalRole}
                      <p>
                        {u.propertyRoles
                          .map((m) => m.role + ' (' + m.propertyId + ')')
                          .join(', ') || 'Customer / applicant'}
                      </p>
                    </td>
                    <td>{u.status}</td>
                    <td>
                      <Button
                        variant="outline"
                        disabled={u.id === currentId}
                        onClick={() => setEditing(u)}
                      >
                        Manage user
                      </Button>
                    </td>
                  </tr>
                )
              }
              const h = item as PlatformHotel
              return (
                <tr key={h.id}>
                  <td className="py-3">
                    {h.name}
                    <p>{h.city}</p>
                  </td>
                  <td>{h.owner?.name ?? h.owner?.email ?? h.ownerId}</td>
                  <td>{h.status}</td>
                  <td>
                    {['approved', 'suspended'].includes(h.status) && (
                      <Button
                        variant="outline"
                        disabled={suspend.isPending}
                        onClick={() => suspend.mutate(h)}
                      >
                        {h.status === 'approved' ? 'Suspend hotel' : 'Restore hotel'}
                      </Button>
                    )}
                    {h.status === 'approved' && (
                      <Button variant="outline" onClick={() => setHotel(h)}>
                        Manage team
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data?.items.length === 0 && <p>No matches.</p>}
      <div className="flex gap-3">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} - {data?.total ?? 0} records
        </span>
        <Button
          variant="outline"
          disabled={!data || page * 20 >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
