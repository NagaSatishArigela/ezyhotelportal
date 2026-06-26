import { sleep } from '@/lib/utils'
import type { User, OnboardingStatus } from '@/types'

// Simulated JWT — base64(header).base64(payload).signature
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 }))
  return `${header}.${body}.mock_sig`
}

export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// ── Demo users ──────────────────────────────────────────────
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'owner@demo.com': {
    password: 'demo1234',
    user: {
      id: 'usr_owner_001',
      name: 'Ravi Sharma',
      email: 'owner@demo.com',
      phone: '+91 98765 43210',
      role: 'owner',
      avatarInitials: 'RS',
      businessEntity: 'individual',
      onboardingStatus: 'in_progress',
      onboardingStep: 1,
      propertyId: undefined,
    },
  },
  'approved@demo.com': {
    password: 'demo1234',
    user: {
      id: 'usr_owner_002',
      name: 'Priya Mehta',
      email: 'approved@demo.com',
      phone: '+91 91234 56789',
      role: 'owner',
      avatarInitials: 'PM',
      businessEntity: 'pvt_ltd',
      onboardingStatus: 'approved',
      onboardingStep: 7,
      propertyId: 'PR-2041',
    },
  },
  'admin@demo.com': {
    password: 'demo1234',
    user: {
      id: 'usr_admin_001',
      name: 'Ankit Verma',
      email: 'admin@demo.com',
      phone: '+91 99887 76655',
      role: 'admin',
      avatarInitials: 'AV',
    },
  },
  'support@demo.com': {
    password: 'demo1234',
    user: {
      id: 'usr_support_001',
      name: 'Sneha Patel',
      email: 'support@demo.com',
      phone: '+91 88776 65544',
      role: 'support',
      avatarInitials: 'SP',
    },
  },
  'superadmin@demo.com': {
    password: 'demo1234',
    user: {
      id: 'usr_superadmin_001',
      name: 'Vikram Reddy',
      email: 'superadmin@demo.com',
      phone: '+91 77665 54433',
      role: 'super_admin',
      avatarInitials: 'VR',
    },
  },
}

export interface LoginResult {
  user: User
  token: string
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    await sleep(800)
    const entry = DEMO_USERS[email.toLowerCase()]
    if (!entry || entry.password !== password) {
      throw new Error('Invalid email or password.')
    }
    const token = makeToken({ sub: entry.user.id, role: entry.user.role, email })
    return { user: entry.user, token }
  },

  refreshToken: async (token: string): Promise<string> => {
    await sleep(300)
    const payload = decodeToken(token)
    if (!payload) throw new Error('Invalid token')
    return makeToken(payload)
  },

  updateOnboardingStatus: async (
    _userId: string,
    status: OnboardingStatus,
    step?: number
  ): Promise<void> => {
    await sleep(400)
    // In real implementation this hits the backend
    console.debug('[mock] onboarding status updated:', status, step)
  },
}
