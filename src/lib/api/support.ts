import { api } from '../api'

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated'
export type SupportTicketPriority = 'low' | 'medium' | 'high'

export interface SupportTicket {
  id: string
  subject: string
  description: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  category: string | null
  raisedByUserId: string
  assignedToUserId: string | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface SupportQueueResult {
  items: SupportTicket[]
  total: number
  page: number
  limit: number
}

export interface SupportUser {
  id: string
  name: string | null
  email: string
  phone: string
  globalRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT'
  status: string
  createdAt: string
}

export const supportApi = {
  queue(params: { status?: SupportTicketStatus; page?: number; limit?: number } = {}): Promise<SupportQueueResult> {
    return api.get<SupportQueueResult>('/support/tickets', { params }).then((r) => r.data)
  },
  get(id: string): Promise<SupportTicket> {
    return api.get<SupportTicket>(`/support/tickets/${id}`).then((r) => r.data)
  },
  resolve(id: string, resolutionNote: string): Promise<SupportTicket> {
    return api.post<SupportTicket>(`/support/tickets/${id}/resolve`, { resolutionNote }).then((r) => r.data)
  },
  escalate(id: string): Promise<SupportTicket> {
    return api.post<SupportTicket>(`/support/tickets/${id}/escalate`).then((r) => r.data)
  },
  lookupUsers(q: string): Promise<SupportUser[]> {
    return api.get<SupportUser[]>('/support/users/lookup', { params: { q } }).then((r) => r.data)
  },
}
