import { api } from '@/lib/api'

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN'
export type AdminStatus = 'active' | 'suspended' | 'deleted'

export interface AdminUser {
  id: string
  name: string | null
  phone: string
  email: string
  globalRole: AdminRole
  status: AdminStatus
  createdAt: string
}

export interface AdminListResult {
  items: AdminUser[]
  total: number
  page: number
  limit: number
}

export interface PlatformStats {
  totalProperties: number
  activeProperties: number
  totalBookings: number
  bookingsThisMonth: number
  grossRevenuePaise: number
  grossRevenueThisMonthPaise: number
  totalPayoutsReleasedPaise: number
  totalTdsPaise: number
  activeAdmins: number
  totalOwners: number
  activeBookings: number
}

export interface PlatformSettings {
  id: string
  commissionPct: number
  tdsPct: number
  payoutDayOfWeek: number
  minBookingHours: number
  maxBookingHours: number
  cancellationWindowHours: number
  updatedAt: string
  updatedBy: string | null
}

export interface CreateAdminPayload {
  name: string
  phone: string
  email: string
}

export interface UpdateSettingsPayload {
  commissionPct?: number
  payoutDayOfWeek?: number
  minBookingHours?: number
  maxBookingHours?: number
  cancellationWindowHours?: number
}

const BASE = '/super-admin'

export const superAdminApi = {
  getStats: (): Promise<PlatformStats> =>
    api.get<PlatformStats>(`${BASE}/stats`).then((r) => r.data),

  listAdmins: (page = 1, limit = 20): Promise<AdminListResult> =>
    api.get<AdminListResult>(`${BASE}/admins`, { params: { page, limit } }).then((r) => r.data),

  createAdmin: (payload: CreateAdminPayload): Promise<AdminUser> =>
    api.post<AdminUser>(`${BASE}/admins`, payload).then((r) => r.data),

  toggleStatus: (id: string, status: AdminStatus): Promise<AdminUser> =>
    api.patch<AdminUser>(`${BASE}/admins/${id}/status`, { status }).then((r) => r.data),

  getSettings: (): Promise<PlatformSettings> =>
    api.get<PlatformSettings>(`${BASE}/settings`).then((r) => r.data),

  updateSettings: (payload: UpdateSettingsPayload): Promise<PlatformSettings> =>
    api.patch<PlatformSettings>(`${BASE}/settings`, payload).then((r) => r.data),
}
