import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { hotelTeamApi, apiMessage, type HotelRole } from '@/lib/api/hotelTeam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
const roleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  permissions: z.array(z.string()),
})
const memberSchema = z.object({ email: z.string().email(), selection: z.string().min(1) })
export function HotelTeamPage({ propertyId: explicitId }: { propertyId?: string }) {
  const propertyId = useAuthStore((s) => explicitId ?? s.user?.propertyId) ?? ''
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string>()
  const roleForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', permissions: [] },
  })
  const memberForm = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: { email: '', selection: 'STAFF' },
  })
  const { data, isLoading, isError } = useQuery({
    queryKey: ['hotel-team', propertyId],
    queryFn: () => hotelTeamApi.get(propertyId),
    enabled: !!propertyId,
  })
  const change = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hotel-team', propertyId] })
      void qc.invalidateQueries({ queryKey: ['hotel-memberships'] })
      toast.success('Hotel access updated')
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
  const editRole = (role: HotelRole) => {
    setEditing(role.id)
    roleForm.reset({ name: role.name, permissions: role.permissions })
  }
  if (isLoading) return <p>Loading hotel team...</p>
  if (isError || !data)
    return (
      <p role="alert">
        Unable to load team. Only the approved hotel owner or platform administrators can manage
        access.
      </p>
    )
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hotel team and roles</h1>
      <p>
        Permissions apply only to this hotel. Owners retain control of team access. Staff must first
        register a customer account.
      </p>
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">Add staff in two steps</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>The staff member creates their own account on EzyHotels Web, using their own phone and email.</li>
          <li>Enter that registered email below and assign a role for this hotel. They can then sign in to the portal and select this hotel.</li>
        </ol>
        <a className="text-primary-600 underline" href={`${(import.meta.env.VITE_WEB_URL ?? 'http://localhost:3001').replace(/\/$/, '')}/register`} target="_blank" rel="noopener noreferrer">Open staff registration</a>
        <p>Each person uses their own login. This form assigns hotel access; it does not create an account or send an invitation. Only the owner and platform administrators can manage team access.</p>
      </section>
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">Assign or change a member</h2>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={memberForm.handleSubmit((v) =>
            change.mutate(() => hotelTeamApi.assign(propertyId, v.email, v.selection))
          )}
        >
          <label>
            Email
            <Input aria-label="Member email" {...memberForm.register('email')} />
          </label>
          <label>
            Hotel role
            <select
              className="block border rounded p-2"
              aria-label="Member role"
              {...memberForm.register('selection')}
            >
              <option value="HOTEL_ADMIN">Hotel admin</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
              {data.customRoles.map((r) => (
                <option key={r.id} value={'custom:' + r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={change.isPending} type="submit">
            Assign member
          </Button>
          {memberForm.formState.errors.email && <p role="alert">Enter a valid email address.</p>}
        </form>
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Member</th>
                <th>Hotel role</th>
                <th>Account status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.userId}>
                  <td className="py-3">
                    {m.user.name ?? m.user.email}
                    <p className="text-sm">{m.user.email}</p>
                  </td>
                  <td>{m.hotelRole?.name ?? m.role}</td>
                  <td>{m.user.status}</td>
                  <td>
                    {m.role !== 'OWNER' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() =>
                            memberForm.reset({
                              email: m.user.email,
                              selection: m.hotelRoleId ? 'custom:' + m.hotelRoleId : m.role,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          disabled={change.isPending}
                          onClick={() =>
                            change.mutate(() => hotelTeamApi.remove(propertyId, m.userId))
                          }
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">{editing ? 'Edit custom role' : 'Create custom role'}</h2>
        <form
          className="space-y-3"
          onSubmit={roleForm.handleSubmit((v) =>
            change.mutate(async () => {
              await hotelTeamApi.saveRole(propertyId, v, editing)
              setEditing(undefined)
              roleForm.reset({ name: '', permissions: [] })
            })
          )}
        >
          <label>
            Role name
            <Input aria-label="Role name" {...roleForm.register('name')} />
          </label>
          {roleForm.formState.errors.name && (
            <p role="alert">Use 2-80 characters for the role name.</p>
          )}
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend>Allowed operations</legend>
            {data.permissions.map((p) => (
              <label key={p} className="flex gap-2">
                <input type="checkbox" value={p} {...roleForm.register('permissions')} />
                {p.replace(/_/g, ' ')}
              </label>
            ))}
          </fieldset>
          <Button disabled={change.isPending} type="submit">
            Save role
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(undefined)
                roleForm.reset({ name: '', permissions: [] })
              }}
            >
              Cancel edit
            </Button>
          )}
        </form>
        {data.customRoles.map((r) => (
          <div key={r.id} className="border-t py-3">
            <strong>{r.name}</strong>
            <p>{r.permissions.join(', ') || 'No operational permissions'}</p>
            <Button variant="outline" onClick={() => editRole(r)}>
              Edit role
            </Button>
            <Button
              variant="outline"
              disabled={change.isPending}
              onClick={() => change.mutate(() => hotelTeamApi.deleteRole(propertyId, r.id))}
            >
              Delete role
            </Button>
          </div>
        ))}
        <details>
          <summary>Standard role permissions</summary>
          {Object.entries(data.roles).map(([role, permissions]) => (
            <p key={role}>
              <strong>{role}</strong>: {permissions.join(', ')}
            </p>
          ))}
        </details>
      </section>
    </div>
  )
}
