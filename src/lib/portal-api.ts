import { withMembership } from './hotel-access'
import type { HotelMembership } from '@/types'
/**
 * portal-api.ts — real backend API calls for the partner portal.
 * Uses the shared `api` axios instance which auto-attaches the Bearer token
 * from the auth store and routes through the Vite proxy → localhost:4000.
 */
import { api } from './api'
import type { User, Role } from '@/types'

// ── Type helpers ────────────────────────────────────────────────────────────

type GlobalRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT'

function mapRole(globalRole: GlobalRole): Role {
  if (globalRole === 'SUPER_ADMIN') return 'super_admin'
  if (globalRole === 'ADMIN') return 'admin'
  if (globalRole === 'SUPPORT') return 'support'
  return 'applicant'
}


function buildInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 2).toUpperCase()
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface PortalLoginResult {
  user: User
  token: string
  refreshToken: string
}

/**
 * Replaces the mock authApi.login().
 * 1. POST /auth/login  → tokens + server user
 * 2. GET  /me/property-status  → owner's current property & status (owners only)
 */
export async function portalLogin(email: string, password: string): Promise<PortalLoginResult> {
  // Step 1 — login
  const { data: loginData } = await api.post<{
    user: {
      id: string
      name: string | null
      phone: string
      email: string
      globalRole: GlobalRole
      status: string
    }
    tokens: { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }
  }>('/auth/login', { email, password })

  const { user: srv, tokens } = loginData
  const role = mapRole(srv.globalRole)
  const name = srv.name ?? email.split('@')[0]

  // Step 2 — for owners, check their property status
  const memberships = role === 'applicant' ? (await api.get<HotelMembership[]>('/me/properties', { headers: { Authorization: `Bearer ${tokens.accessToken}` } })).data : []
  const selected = memberships.find(m => m.status === 'approved' && m.role) ?? memberships.find(m => m.isApplicant)
  const user: User = {
    id: srv.id,
    name,
    email: srv.email,
    phone: srv.phone,
    role,
    avatarInitials: buildInitials(name),
    onboardingStatus: 'approved',
  }

  return { user: role === 'applicant' ? withMembership(user, selected, memberships) : user, token: tokens.accessToken, refreshToken: tokens.refreshToken }
}

// ── Owner onboarding ──────────────────────────────────────────────────────────

/** Create a new property draft. Returns the propertyId. */
export async function createPropertyDraft(): Promise<string> {
  const { data } = await api.post<{ propertyId: string }>('/properties/draft')
  return data.propertyId
}

/** Save one step of the onboarding wizard. */
export async function saveOnboardingStep(
  propertyId: string,
  step: number,
  data: Record<string, unknown>,
): Promise<void> {
  await api.patch(`/properties/${propertyId}/step/${step}`, data)
}

/** Submit the completed onboarding draft for admin review. */
export async function submitOnboarding(propertyId: string): Promise<{
  propertyId: string
  status: string
  submissionRef: string
  submittedAt: string
}> {
  const { data } = await api.post(`/properties/${propertyId}/submit`)
  return data
}

/** One reviewer-flagged item the owner must fix (admin-authored). */
export interface RevisionItem {
  field: string
  reason: string
}

/** One revision round recorded by the server (newest last). */
export interface RevisionNote {
  adminId?: string
  timestamp?: string
  items: RevisionItem[]
}

/** Get the current status of a property (for the status page / Step 7 review). */
export async function getPropertyStatus(propertyId: string): Promise<{
  status: string
  submissionRef: string | null
  submittedAt: string | null
  revisionCount: number
  revisionNotes: RevisionNote[]
  timeline: { label: string; status: 'done' | 'current' | 'pending'; at: string | null }[]
}> {
  const { data } = await api.get(`/properties/${propertyId}/status`)
  return data
}

/**
 * Pull the latest round of reviewer-flagged items out of the raw revisionNotes
 * blob (server stores an append-only array of { adminId, timestamp, items }).
 * Defensive: the field is typed loosely server-side (`unknown`).
 */
export function latestRevisionItems(revisionNotes: unknown): RevisionItem[] {
  if (!Array.isArray(revisionNotes) || revisionNotes.length === 0) return []
  const last = revisionNotes[revisionNotes.length - 1] as { items?: unknown }
  if (!last || !Array.isArray(last.items)) return []
  return last.items.filter(
    (i): i is RevisionItem =>
      !!i && typeof (i as RevisionItem).field === 'string' && typeof (i as RevisionItem).reason === 'string',
  )
}

/** Get the saved draft data for a property. */
export async function getPropertyDraft(propertyId: string): Promise<{
  propertyId: string
  status: string
  draftStep: number | null
  draftData: Record<string, unknown>
}> {
  const { data } = await api.get(`/properties/${propertyId}/draft`)
  return data
}

// ── Thin wrappers kept for backward compat with ownerApi mock call sites ─────

/** IFSC lookup — kept as mock until a real IFSC provider is configured. */
export async function verifyIFSC(ifsc: string): Promise<{ bank: string; branch: string; city: string }> {
  const MOCK: Record<string, { bank: string; branch: string; city: string }> = {
    HDFC0001234: { bank: 'HDFC Bank', branch: 'Connaught Place', city: 'New Delhi' },
    SBIN0001234: { bank: 'State Bank of India', branch: 'MG Road', city: 'Bengaluru' },
    ICIC0001234: { bank: 'ICICI Bank', branch: 'Bandra West', city: 'Mumbai' },
    AXIS0001234: { bank: 'Axis Bank', branch: 'Bandra', city: 'Mumbai' },
    KOTK0001234: { bank: 'Kotak Mahindra Bank', branch: 'Lower Parel', city: 'Mumbai' },
  }
  await new Promise((r) => setTimeout(r, 700))
  const result = MOCK[ifsc.toUpperCase()]
  if (!result) throw new Error('Invalid IFSC code. Try HDFC0001234, SBIN0001234, or ICIC0001234.')
  return result
}

/** Penny drop — kept as mock until a real banking API is configured. */
export async function pennyDrop(): Promise<{ success: boolean; amount: number; message: string }> {
  await new Promise((r) => setTimeout(r, 2000))
  return { success: true, amount: 1, message: '₹1 credited successfully. Account verified.' }
}

/**
 * Real file upload — POSTs multipart/form-data to the server's /uploads
 * endpoint and returns the absolute URL the storefront/admin can load.
 * Reuses the shared axios instance (auto-attaches the Bearer token); axios
 * strips the instance's JSON Content-Type for FormData bodies and lets the
 * browser set the multipart boundary.
 */
export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  // The shared axios instance defaults Content-Type to application/json; for a
  // multipart upload we must clear it so the browser sets the correct
  // `multipart/form-data; boundary=…` header, otherwise the server 400s.
  const { data } = await api.post<{ url: string; key: string }>('/uploads', form, {
    headers: { 'Content-Type': undefined },
  })
  return { url: data.url }
}

/** Pincode lookup — kept as mock until a real pincode provider is configured. */
export async function verifyPincode(pincode: string): Promise<{ city: string; state: string }> {
  const MOCK: Record<string, { city: string; state: string }> = {
    '110001': { city: 'New Delhi', state: 'Delhi' },
    '400001': { city: 'Mumbai', state: 'Maharashtra' },
    '400050': { city: 'Mumbai', state: 'Maharashtra' },
    '560001': { city: 'Bengaluru', state: 'Karnataka' },
    '600001': { city: 'Chennai', state: 'Tamil Nadu' },
    '500001': { city: 'Hyderabad', state: 'Telangana' },
    '700001': { city: 'Kolkata', state: 'West Bengal' },
    '411001': { city: 'Pune', state: 'Maharashtra' },
    '380001': { city: 'Ahmedabad', state: 'Gujarat' },
    '302001': { city: 'Jaipur', state: 'Rajasthan' },
  }
  await new Promise((r) => setTimeout(r, 400))
  return MOCK[pincode] ?? { city: '', state: '' }
}
