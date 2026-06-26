import { sleep, generateId } from '@/lib/utils'

export const ownerApi = {
  createDraft: async (data: Record<string, unknown>) => {
    await sleep(600)
    return { draftId: generateId('DRAFT'), data }
  },

  updateStep: async (step: number, data: Record<string, unknown>) => {
    await sleep(400)
    return { step, saved: true, data }
  },

  autoSave: async (step: number, data: Record<string, unknown>) => {
    await sleep(300)
    return { step, savedAt: new Date().toISOString(), data }
  },

  submitOnboarding: async (draftId: string) => {
    await sleep(1000)
    return {
      draftId,
      referenceId: generateId('KYC'),
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    }
  },

  getStatus: async (draftId: string) => {
    void draftId
    await sleep(500)
    return { status: 'under_review', updatedAt: new Date().toISOString() }
  },

  uploadDocument: async (file: File, type: string) => {
    void file
    void type
    await sleep(1200)
    return { url: 'https://mock.cdn/doc.pdf', verified: true }
  },

  verifyIFSC: async (ifsc: string) => {
    await sleep(700)
    const MOCK_BANKS: Record<string, { bank: string; branch: string; city: string }> = {
      HDFC0001234: { bank: 'HDFC Bank', branch: 'Connaught Place', city: 'New Delhi' },
      SBIN0001234: { bank: 'State Bank of India', branch: 'MG Road', city: 'Bengaluru' },
      ICIC0001234: { bank: 'ICICI Bank', branch: 'Bandra West', city: 'Mumbai' },
    }
    const result = MOCK_BANKS[ifsc.toUpperCase()]
    if (!result) throw new Error('Invalid IFSC code')
    return result
  },

  pennyDrop: async () => {
    await sleep(2000)
    return { success: true, amount: 1, message: '₹1 credited successfully' }
  },

  verifyGST: async (gstin: string) => {
    await sleep(800)
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      throw new Error('Invalid GSTIN format')
    }
    return { valid: true, legalName: 'Mock Business Pvt Ltd', status: 'Active' }
  },

  verifyPincode: async (pincode: string) => {
    await sleep(400)
    const MOCK_PINCODES: Record<string, { city: string; state: string }> = {
      '110001': { city: 'New Delhi', state: 'Delhi' },
      '400001': { city: 'Mumbai', state: 'Maharashtra' },
      '560001': { city: 'Bengaluru', state: 'Karnataka' },
      '600001': { city: 'Chennai', state: 'Tamil Nadu' },
      '500001': { city: 'Hyderabad', state: 'Telangana' },
      '700001': { city: 'Kolkata', state: 'West Bengal' },
    }
    return MOCK_PINCODES[pincode] ?? { city: '', state: '' }
  },
}
