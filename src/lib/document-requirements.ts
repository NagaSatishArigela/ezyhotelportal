export type DocumentType =
  | 'owner_photo' | 'id_proof_back' | 'udyam_certificate'
  | 'pan_card' | 'id_proof' | 'rental_agreement' | 'cancelled_cheque'
  | 'gstin_certificate' | 'fire_safety_cert' | 'fssai_license' | 'trade_license'
  | 'partnership_deed' | 'llp_agreement' | 'incorporation_certificate' | 'board_resolution'

export interface DocDef { id: string; type: DocumentType; label: string; required: boolean; show: boolean }

export function documentRequirements(entity = 'individual', _hasGST = false, amenities: string[] = []): DocDef[] {
  const needsFssai = amenities.some(a => ['restaurant', 'bar', 'room_service'].includes(a))
  return [
    { id: 'owner_photo', type: 'owner_photo', label: 'Owner photo', required: false, show: true },
    { id: 'pan', type: 'pan_card', label: 'PAN card', required: true, show: true },
    { id: 'aadhaar', type: 'id_proof', label: 'Aadhaar front', required: true, show: true },
    { id: 'aadhaar_back', type: 'id_proof_back', label: 'Aadhaar back', required: true, show: true },
    { id: 'ownership', type: 'rental_agreement', label: 'Property ownership / lease', required: true, show: true },
    { id: 'cheque', type: 'cancelled_cheque', label: 'Cancelled cheque', required: true, show: true },
    { id: 'gst_cert', type: 'gstin_certificate', label: 'GST certificate', required: false, show: true },
    { id: 'udyam', type: 'udyam_certificate', label: 'Udyam certificate', required: false, show: true },
    { id: 'fire_noc', type: 'fire_safety_cert', label: 'Fire safety certificate', required: false, show: true },
    { id: 'fssai', type: 'fssai_license', label: 'FSSAI license', required: false, show: needsFssai },
    { id: 'trade', type: 'trade_license', label: 'Business licence (trade / municipal / panchayat / government-issued business proof)', required: true, show: true },
    { id: 'partnership_deed', type: 'partnership_deed', label: 'Partnership deed', required: true, show: entity === 'partnership' },
    { id: 'llp_agreement', type: 'llp_agreement', label: 'LLP agreement', required: true, show: entity === 'llp' },
    { id: 'incorporation_certificate', type: 'incorporation_certificate', label: 'Certificate of incorporation', required: true, show: ['llp', 'private_limited', 'public_limited'].includes(entity) },
    { id: 'director', type: 'board_resolution', label: 'Board resolution', required: true, show: ['private_limited', 'public_limited'].includes(entity) },
  ].filter(doc => doc.show) as DocDef[]
}
