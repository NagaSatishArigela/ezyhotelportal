/**
 * portal-api.ts — real backend API calls for the partner portal.
 * Uses the shared `api` axios instance which auto-attaches the Bearer token
 * from the auth store and routes through the Vite proxy → localhost:4000.
 */
import { api } from './api'
import type { User, Role, OnboardingStatus } from '@/types'

// ── Type helpers ────────────────────────────────────────────────────────────

type GlobalRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'
type PropertyStatus = 'draft' | 'pending_review' | 'needs_revision' | 'approved' | 'rejected' | 'suspended' | 'escalated' | null

function mapRole(globalRole: GlobalRole): Role {
  if (globalRole === 'SUPER_ADMIN') return 'super_admin'
  if (globalRole === 'ADMIN') return 'admin'
  return 'owner'
}

function mapPropertyStatus(status: PropertyStatus): OnboardingStatus {
  switch (status) {
    case null:              return 'not_started'
    case 'draft':           return 'in_progress'
    case 'pending_review':  return 'submitted'
    case 'needs_revision':  return 'revision_requested'
    case 'approved':        return 'approved'
    case 'rejected':        return 'rejected'
    case 'escalated':       return 'under_review'
    case 'suspended':       return 'approved'
    default:                return 'in_progress'
  }
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
  let onboardingStatus: OnboardingStatus = 'approved' // default for admins
  let propertyId: string | undefined

  if (role === 'owner') {
    try {
      const { data: propData } = await api.get<{
        id: string | null
        status: PropertyStatus
        draftStep: number | null
      }>('/me/property-status', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      onboardingStatus = mapPropertyStatus(propData.status)
      if (propData.id) propertyId = propData.id
    } catch (err) {
      // Re-throw: silently defaulting would route an approved owner to the
      // onboarding wizard on any transient network error. Let the login
      // form's onError handler show a toast so the user can retry.
      console.error('[portalLogin] GET /me/property-status failed:', err)
      throw new Error('Unable to load your account status. Please try logging in again.')
    }
  }

  const user: User = {
    id: srv.id,
    name,
    email: srv.email,
    phone: srv.phone,
    role,
    avatarInitials: buildInitials(name),
    onboardingStatus,
    onboardingStep: onboardingStatus === 'in_progress' ? 1 : undefined,
    propertyId,
  }

  return { user, token: tokens.accessToken, refreshToken: tokens.refreshToken }
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

/** Get the current status of a property (for the status page / Step 7 review). */
export async function getPropertyStatus(propertyId: string): Promise<{
  status: string
  submissionRef: string | null
  submittedAt: string | null
  revisionCount: number
  timeline: { label: string; status: 'done' | 'current' | 'pending'; at: string | null }[]
}> {
  const { data } = await api.get(`/properties/${propertyId}/status`)
  return data
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

/** Document upload — kept as mock until cloud storage is configured. */
export async function uploadDocument(file: File, type: string): Promise<{ url: string; verified: boolean }> {
  void file; void type
  await new Promise((r) => setTimeout(r, 1200))
  return { url: `https://mock.cdn/docs/${type}-${Date.now()}.pdf`, verified: true }
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
