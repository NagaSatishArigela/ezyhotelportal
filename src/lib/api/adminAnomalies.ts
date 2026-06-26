import { api } from '@/lib/api'
import type { AdminBookingAdminAction } from './adminBookings'

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low'
export type AnomalyEntityType = 'property' | 'customer' | 'booking'
export type AnomalyStatus = 'detected' | 'investigating' | 'resolved_action' | 'resolved_fp' | 'escalated'

export const ANOMALY_RESOLUTION_TYPES = [
  'voided_booking',
  'flagged_for_review',
  'contacted_owner',
  'no_action_needed',
  'other',
] as const

export type AnomalyResolutionType = (typeof ANOMALY_RESOLUTION_TYPES)[number]

export const ANOMALY_SEVERITY_VALUES: AnomalySeverity[] = ['critical', 'high', 'medium', 'low']
export const ANOMALY_STATUS_VALUES: AnomalyStatus[] = [
  'detected',
  'investigating',
  'resolved_action',
  'resolved_fp',
  'escalated',
]

export interface AdminAnomalyListItem {
  id: string
  ruleId: string
  severity: AnomalySeverity
  entityType: AnomalyEntityType
  entityId: string
  entityLabel: string | null
  description: string
  status: AnomalyStatus
  detectedAt: string
  resolvedAt: string | null
}

export interface AdminAnomalyListResult {
  items: AdminAnomalyListItem[]
  total: number
  page: number
  limit: number
}

export interface AnomalyEntityRef {
  type: AnomalyEntityType
  id: string
  label: string
  href: string
}

export interface BookingEvidenceSummary {
  id: string
  bookingRef: string
  status: string
  totalAmountPaise: number
  checkInAt: string
  checkOutAt: string
}

export interface Anomaly {
  id: string
  ruleId: string
  severity: AnomalySeverity
  entityType: AnomalyEntityType
  entityId: string
  description: string
  evidence: unknown
  status: AnomalyStatus
  resolutionType: string | null
  resolutionNotes: string | null
  resolvedBy: string | null
  detectedAt: string
  resolvedAt: string | null
}

export interface AdminAnomalyDetail {
  anomaly: Anomaly
  entity: AnomalyEntityRef
  evidence: Record<string, unknown>
  relatedActions: AdminBookingAdminAction[]
}

export interface AdminAnomalyListParams {
  severity?: AnomalySeverity[]
  ruleId?: string
  status?: AnomalyStatus[]
  dateFrom?: string
  dateTo?: string
  propertyId?: string
  customerId?: string
  page?: number
  limit?: number
  sort?: 'severity' | 'detectedAt' | 'status'
  order?: 'asc' | 'desc'
}

export interface UpdateAnomalyStatusBody {
  status: AnomalyStatus
  resolutionType?: AnomalyResolutionType
  resolutionNotes?: string
}

function toQueryParams(params: AdminAnomalyListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params.severity && params.severity.length > 0) query.severity = params.severity.join(',')
  if (params.ruleId) query.ruleId = params.ruleId
  if (params.status && params.status.length > 0) query.status = params.status.join(',')
  if (params.dateFrom) query.dateFrom = params.dateFrom
  if (params.dateTo) query.dateTo = params.dateTo
  if (params.propertyId) query.propertyId = params.propertyId
  if (params.customerId) query.customerId = params.customerId
  if (params.page != null) query.page = params.page
  if (params.limit != null) query.limit = params.limit
  if (params.sort) query.sort = params.sort
  if (params.order) query.order = params.order
  return query
}

export const adminAnomaliesApi = {
  async list(params: AdminAnomalyListParams): Promise<AdminAnomalyListResult> {
    const res = await api.get<AdminAnomalyListResult>('/admin/anomalies', { params: toQueryParams(params) })
    return res.data
  },

  async unresolvedCount(): Promise<{ count: number }> {
    const res = await api.get<{ count: number }>('/admin/anomalies/unresolved-count')
    return res.data
  },

  async getDetail(id: string): Promise<AdminAnomalyDetail> {
    const res = await api.get<AdminAnomalyDetail>(`/admin/anomalies/${id}`)
    return res.data
  },

  async updateStatus(id: string, body: UpdateAnomalyStatusBody): Promise<Anomaly> {
    const res = await api.patch<Anomaly>(`/admin/anomalies/${id}`, body)
    return res.data
  },
}
