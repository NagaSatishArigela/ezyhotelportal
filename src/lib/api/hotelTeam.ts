import { api } from '@/lib/api'
export interface HotelRole {
  id: string
  name: string
  permissions: string[]
}
export interface TeamMember {
  userId: string
  role: string
  hotelRoleId: string | null
  hotelRole: HotelRole | null
  user: { id: string; name: string | null; email: string; status: string }
}
export interface HotelTeam {
  permissions: string[]
  roles: Record<string, string[]>
  customRoles: HotelRole[]
  members: TeamMember[]
}
const url = (id: string) => '/properties/' + id + '/team'
export const hotelTeamApi = {
  get: (id: string) => api.get<HotelTeam>(url(id)).then((r) => r.data),
  saveRole: (id: string, data: { name: string; permissions: string[] }, roleId?: string) =>
    roleId ? api.patch(url(id) + '/roles/' + roleId, data) : api.post(url(id) + '/roles', data),
  deleteRole: (id: string, roleId: string) => api.delete(url(id) + '/roles/' + roleId),
  assign: (id: string, email: string, selection: string) =>
    api.post(url(id) + '/members', {
      email,
      ...(selection.startsWith('custom:')
        ? { hotelRoleId: selection.slice(7) }
        : { role: selection }),
    }),
  remove: (id: string, userId: string) => api.delete(url(id) + '/members/' + userId),
}
export function apiMessage(error: unknown): string {
  const data = (
    error as { response?: { data?: { error?: { message?: string | string[] } | string } } }
  )?.response?.data
  const message = typeof data?.error === 'object' ? data.error.message : data?.error
  return Array.isArray(message)
    ? message.join(', ')
    : (message ?? 'Unable to save. Please try again.')
}
