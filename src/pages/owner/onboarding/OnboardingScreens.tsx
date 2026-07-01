import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Building2, Camera, CheckCircle, CreditCard, FileText, Home, ImagePlus,
  IndianRupee, MapPin, Shield, Upload, Wifi, Car, Waves, Dumbbell,
  Utensils, Phone, Trash2, Plus, Search, Loader2, CheckCheck,
  Info, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldWrapper } from '@/components/shared/FieldWrapper'
import { DocumentUploader } from '@/components/shared/DocumentUploader'
import { cn, formatINR } from '@/lib/utils'
import { useOnboardingStore } from '@/store/onboarding.store'
import { useAutoSave } from '@/hooks/useAutoSave'
import {
  createPropertyDraft, saveOnboardingStep, submitOnboarding,
  verifyIFSC, pennyDrop, uploadDocument, verifyPincode,
} from '@/lib/portal-api'

// ── Real auto-save hook ─────────────────────────────────────────────────────
// Creates the property draft on first save, then saves each step to the backend.
// Also registers saveNow with the store so WizardShell can flush any pending
// debounce before navigating away (avoids losing data on fast "Continue" clicks).

function useOnboardingAutoSave(step: number) {
  const setDraftId      = useOnboardingStore((s) => s.setDraftId)
  const setOnBeforeNext = useOnboardingStore((s) => s.setOnBeforeNext)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveFn = useCallback(async (data: Record<string, unknown>) => {
    let draftId = useOnboardingStore.getState().draftId
    if (!draftId) {
      draftId = await createPropertyDraft()
      setDraftId(draftId)
    }
    await saveOnboardingStep(draftId, step, data)
  }, [step, setDraftId])

  const result = useAutoSave({ step, saveFn })

  // Keep a stable ref so the effect dependency doesn't change on every render
  const saveNowRef = useRef(result.saveNow)
  saveNowRef.current = result.saveNow

  useEffect(() => {
    setOnBeforeNext(() => saveNowRef.current())
    return () => setOnBeforeNext(null)
  }, [setOnBeforeNext])

  return result
}

// ── Shared helpers ─────────────────────────────────────────────────────────

const PLATFORM_COMMISSION = 12 // default %; editable by Admin in Super Admin settings

const COMMISSION_BY_CATEGORY: Record<string, number> = {
  budget: 15,
  mid: 12,
  premium: 10,
}

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Step {step} of 7</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-navy-900">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-navy-500">{subtitle}</p>
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-(--radius-lg) border border-border bg-white p-6 shadow-1', className)}>
      {children}
    </div>
  )
}

function SideNote({ icon: Icon, title, body, variant = 'info' }: {
  icon: React.ElementType; title: string; body: string; variant?: 'info' | 'warning' | 'success'
}) {
  const colours = {
    info:    { bg: 'bg-primary-50 border-primary-100', text: 'text-primary-600' },
    warning: { bg: 'bg-warning-50 border-warning-400', text: 'text-warning-600' },
    success: { bg: 'bg-success-50 border-success-500', text: 'text-success-700' },
  }[variant]
  return (
    <div className={cn('rounded-(--radius-lg) border p-4', colours.bg)}>
      <Icon className={colours.text} size={20} aria-hidden />
      <p className="mt-3 text-sm font-bold text-navy-900">{title}</p>
      <p className="mt-1 text-sm text-navy-600">{body}</p>
    </div>
  )
}

function TwoCol({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <Card>{children}</Card>
      <div className="space-y-4">{side}</div>
    </div>
  )
}

// ── Step 1 — Account & owner identity ──────────────────────────────────────

const step1Schema = z.object({
  ownerName:        z.string().min(2, 'At least 2 characters'),
  phone:            z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number'),
  email:            z.string().email('Enter a valid email'),
  businessEntity:   z.enum(['individual', 'llp', 'partnership', 'pvtltd']),
  businessName:     z.string().min(2, 'Required'),
  gstNumber:        z.string().optional().or(z.literal('')),
  propertyCategory: z.enum(['budget', 'mid', 'premium']),
})
type Step1Data = z.infer<typeof step1Schema>

const CATEGORIES = [
  { value: 'budget',  label: 'Budget',      desc: 'Economy lodging, no frills', commission: 15 },
  { value: 'mid',     label: 'Mid-market',  desc: 'Comfort + standard amenities', commission: 12 },
  { value: 'premium', label: 'Premium',     desc: 'Upscale experience, full service', commission: 10 },
]

export function Step1PropertyDetails() {
  const stored = useOnboardingStore((s) => s.stepData[1] as Partial<Step1Data> | undefined)
  const { register, watch, setValue, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      ownerName: stored?.ownerName ?? '',
      phone: stored?.phone ?? '',
      email: stored?.email ?? '',
      businessEntity: stored?.businessEntity ?? 'individual',
      businessName: stored?.businessName ?? '',
      gstNumber: stored?.gstNumber ?? '',
      propertyCategory: stored?.propertyCategory ?? 'mid',
    },
  })

  const values = watch()
  const { triggerSave } = useOnboardingAutoSave(1)

  useEffect(() => { triggerSave(values as Record<string, unknown>) }, [JSON.stringify(values)])

  const category = watch('propertyCategory')

  return (
    <div className="space-y-6">
      <StepHeader step={1} title="Account & owner identity" subtitle="Tell us who will manage payouts and be legally responsible for this listing." />
      <TwoCol side={<SideNote icon={Shield} title="Why we need this" body="We verify every property before it goes live. Most checks finish within 24 hours." />}>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrapper label="Owner full name" required error={errors.ownerName?.message}>
              <Input {...register('ownerName')} placeholder="As on government ID" error={!!errors.ownerName} />
            </FieldWrapper>
            <FieldWrapper label="Mobile number" required error={errors.phone?.message}>
              <Input {...register('phone')} placeholder="10-digit number" error={!!errors.phone} />
            </FieldWrapper>
            <FieldWrapper label="Email address" required error={errors.email?.message}>
              <Input {...register('email')} type="email" placeholder="yourname@business.com" error={!!errors.email} />
            </FieldWrapper>
            <FieldWrapper label="Business entity" required>
              <Select {...register('businessEntity')}>
                <option value="individual">Individual / Proprietor</option>
                <option value="llp">LLP / Private Limited</option>
                <option value="partnership">Partnership firm</option>
                <option value="pvtltd">Public Limited Company</option>
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Legal / business name" required className="sm:col-span-2" error={errors.businessName?.message}>
              <Input {...register('businessName')} placeholder="Exact name as per GST / PAN" error={!!errors.businessName} />
            </FieldWrapper>
            <FieldWrapper label="GST number" hint="Optional — required to receive GST invoices for commission" className="sm:col-span-2">
              <Input {...register('gstNumber')} placeholder="22AAAAA0000A1Z5" className="font-mono" />
            </FieldWrapper>
          </div>

          <div>
            <p className="text-sm font-semibold text-navy-700 mb-3">Property category <span className="text-error-500">*</span></p>
            <p className="text-xs text-navy-500 mb-3">Determines the platform commission rate and guest expectations.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setValue('propertyCategory', cat.value as Step1Data['propertyCategory'])}
                  className={cn(
                    'rounded-[12px] border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                    category === cat.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-border hover:border-navy-200'
                  )}
                >
                  <p className="font-bold text-navy-900">{cat.label}</p>
                  <p className="text-xs text-navy-500 mt-0.5">{cat.desc}</p>
                  <p className="text-xs font-bold text-primary-600 mt-2">{cat.commission}% commission</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-navy-400 mt-2">Default rate. Can be customised by Stayflex admin.</p>
          </div>

          <div className="rounded-[10px] border border-primary-100 bg-primary-50 p-4 flex items-start gap-3">
            <Info size={16} className="text-primary-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-navy-900">Phone OTP verification</p>
              <p className="mt-0.5 text-sm text-navy-600">We'll send a 6-digit code to <strong>{watch('phone') || 'your mobile'}</strong> before final submission to confirm account ownership.</p>
            </div>
          </div>
        </div>
      </TwoCol>
    </div>
  )
}

// ── Step 2 — Property details + amenities + policy ──────────────────────────

const PROPERTY_TYPES = [
  { value: 'hotel',       label: 'Hotel',        icon: Building2 },
  { value: 'boutique',    label: 'Boutique',     icon: Building2 },
  { value: 'service_apt', label: 'Service Apt.', icon: Home },
  { value: 'resort',      label: 'Resort',       icon: Waves },
  { value: 'homestay',    label: 'Homestay',     icon: Home },
  { value: 'villa',       label: 'Villa',        icon: Building2 },
]

const AMENITIES_LIST = [
  { id: 'wifi',         label: 'WiFi',              icon: Wifi },
  { id: 'ac',           label: 'Air conditioning',  icon: null },
  { id: 'parking',      label: 'Parking',           icon: Car },
  { id: 'pool',         label: 'Swimming pool',     icon: Waves },
  { id: 'gym',          label: 'Gym / Fitness',     icon: Dumbbell },
  { id: 'restaurant',   label: 'Restaurant',        icon: Utensils },
  { id: 'bar',          label: 'Bar / Lounge',      icon: null },
  { id: 'spa',          label: 'Spa',               icon: null },
  { id: 'reception_24', label: '24hr Reception',    icon: Phone },
  { id: 'room_service', label: 'Room service',      icon: null },
  { id: 'laundry',      label: 'Laundry',           icon: null },
  { id: 'conference',   label: 'Conference room',   icon: null },
  { id: 'rooftop',      label: 'Rooftop access',    icon: null },
  { id: 'couples',      label: 'Couples welcome',   icon: null },
  { id: 'pets',         label: 'Pets allowed',      icon: null },
  { id: 'wheelchair',   label: 'Wheelchair access', icon: null },
  { id: 'cctv',         label: 'CCTV security',     icon: Shield },
  { id: 'ev_charging',  label: 'EV charging',       icon: null },
]

const step2Schema = z.object({
  propertyName:        z.string().min(2, 'Required'),
  propertyType:        z.string().min(1, 'Select a type'),
  address:             z.string().min(5, 'Required'),
  city:                z.string().min(2, 'Required'),
  state:               z.string().min(2, 'Required'),
  pincode:             z.string().regex(/^\d{6}$/, '6-digit PIN code'),
  description:         z.string().min(20, 'Minimum 20 characters'),
  amenities:           z.array(z.string()).min(3, 'Select at least 3 amenities'),
  bookingPolicy:       z.enum(['hourly', 'fullday', 'both']),
  minBookingHours:     z.number().min(1).max(6),
  defaultCheckinTime:  z.string(),
  defaultCheckoutTime: z.string(),
})
type Step2Data = z.infer<typeof step2Schema>

export function Step2RoomsPricing() {
  const stored = useOnboardingStore((s) => s.stepData[2] as Partial<Step2Data> | undefined)
  const { register, watch, setValue, formState: { errors } } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      propertyName: stored?.propertyName ?? '',
      propertyType: stored?.propertyType ?? 'hotel',
      address: stored?.address ?? '',
      city: stored?.city ?? '',
      state: stored?.state ?? '',
      pincode: stored?.pincode ?? '',
      description: stored?.description ?? '',
      amenities: stored?.amenities ?? [],
      bookingPolicy: stored?.bookingPolicy ?? 'both',
      minBookingHours: stored?.minBookingHours ?? 2,
      defaultCheckinTime: stored?.defaultCheckinTime ?? '12:00',
      defaultCheckoutTime: stored?.defaultCheckoutTime ?? '12:00',
    },
  })

  const values = watch()
  const { triggerSave } = useOnboardingAutoSave(2)
  useEffect(() => { triggerSave(values as Record<string, unknown>) }, [JSON.stringify(values)])

  const [pincodeLoading, setPincodeLoading] = useState(false)
  const amenities = watch('amenities')
  const propertyType = watch('propertyType')
  const bookingPolicy = watch('bookingPolicy')

  const fetchPincode = useCallback(async (pin: string) => {
    if (pin.length !== 6) return
    setPincodeLoading(true)
    try {
      const res = await verifyPincode(pin)
      if (res.city) { setValue('city', res.city); setValue('state', res.state) }
    } catch { /* ignore */ }
    finally { setPincodeLoading(false) }
  }, [setValue])

  const toggleAmenity = (id: string) => {
    const current = amenities ?? []
    setValue('amenities', current.includes(id) ? current.filter((a) => a !== id) : [...current, id])
  }

  const BOOKING_POLICIES = [
    { value: 'hourly',  label: 'Hourly only',           desc: 'Guests book by the hour (min 1–6h)' },
    { value: 'fullday', label: 'Full-day only (24h)',    desc: 'Guests book for a full day or overnight' },
    { value: 'both',    label: 'Both hourly & full-day', desc: 'Maximum revenue — offer all options' },
  ]

  return (
    <div className="space-y-6">
      <StepHeader step={2} title="Property details" subtitle="This appears on your public listing and helps guests find and trust your property." />

      <TwoCol side={
        <SideNote icon={MapPin} title="Location accuracy" body="Guests use this for navigation. Enter the full address so the map pin lands at the entrance." variant="warning" />
      }>
        <div className="space-y-5">
          {/* Property name + type */}
          <FieldWrapper label="Property name" required error={errors.propertyName?.message}>
            <Input {...register('propertyName')} placeholder="e.g. The Park Suites" error={!!errors.propertyName} />
          </FieldWrapper>

          <div>
            <p className="text-sm font-semibold text-navy-700 mb-2">Property type <span className="text-error-500">*</span></p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PROPERTY_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('propertyType', value)}
                  className={cn(
                    'rounded-[10px] border p-3 text-xs font-semibold text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                    propertyType === value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border text-navy-600 hover:border-navy-300'
                  )}
                >
                  <Icon className="mx-auto mb-1" size={16} aria-hidden />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <FieldWrapper label="Street address" required error={errors.address?.message}>
            <Input {...register('address')} placeholder="Building, street, locality" error={!!errors.address} />
          </FieldWrapper>
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldWrapper label="PIN code" required error={errors.pincode?.message}>
              <div className="relative">
                <Input
                  {...register('pincode')}
                  placeholder="6 digits"
                  maxLength={6}
                  error={!!errors.pincode}
                  onBlur={(e) => fetchPincode(e.target.value)}
                />
                {pincodeLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-navy-400" />}
              </div>
            </FieldWrapper>
            <FieldWrapper label="City" required error={errors.city?.message}>
              <Input {...register('city')} placeholder="Auto-filled" error={!!errors.city} />
            </FieldWrapper>
            <FieldWrapper label="State" required error={errors.state?.message}>
              <Input {...register('state')} placeholder="Auto-filled" error={!!errors.state} />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Description" error={errors.description?.message} hint="Describe the location, vibe, and what makes guests choose you.">
            <Textarea {...register('description')} rows={3} placeholder="A centrally located boutique stay ideal for business travellers and short city breaks..." />
          </FieldWrapper>
        </div>
      </TwoCol>

      {/* Amenities */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-navy-900">Amenities</h2>
            <p className="text-xs text-navy-500 mt-0.5">Select all that apply — guests filter by these</p>
          </div>
          <Badge variant={amenities.length >= 3 ? 'green' : 'amber'}>
            {amenities.length} selected {amenities.length < 3 ? '(min 3)' : '✓'}
          </Badge>
        </div>
        {errors.amenities && <p className="text-xs text-error-500 mb-3">{errors.amenities.message}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {AMENITIES_LIST.map(({ id, label, icon: Icon }) => {
            const checked = amenities.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleAmenity(id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                  checked ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold' : 'border-border text-navy-600 hover:border-navy-300'
                )}
              >
                {checked ? <CheckCheck size={14} className="shrink-0 text-primary-600" /> : (Icon ? <Icon size={14} className="shrink-0 text-navy-400" /> : <div className="w-[14px] h-[14px] shrink-0" />)}
                <span className="text-xs">{label}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Booking policy */}
      <Card>
        <h2 className="font-display font-bold text-navy-900 mb-1">Booking policy</h2>
        <p className="text-xs text-navy-500 mb-4">This controls what pricing options guests see. You can change this later.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {BOOKING_POLICIES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('bookingPolicy', value as Step2Data['bookingPolicy'])}
              className={cn(
                'rounded-[12px] border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                bookingPolicy === value ? 'border-primary-600 bg-primary-50' : 'border-border hover:border-navy-200'
              )}
            >
              <p className="font-bold text-navy-900 text-sm">{label}</p>
              <p className="text-xs text-navy-500 mt-1">{desc}</p>
            </button>
          ))}
        </div>
        {bookingPolicy !== 'fullday' && (
          <div className="mt-4">
            <FieldWrapper label="Minimum booking duration" hint="Shortest slot guests can book">
              <Select {...register('minBookingHours', { valueAsNumber: true })} className="w-48">
                {[1,2,3,4,5,6].map((h) => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
              </Select>
            </FieldWrapper>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <FieldWrapper label="Default check-in time">
            <Input {...register('defaultCheckinTime')} type="time" className="w-40" />
          </FieldWrapper>
          <FieldWrapper label="Default check-out time">
            <Input {...register('defaultCheckoutTime')} type="time" className="w-40" />
          </FieldWrapper>
        </div>
      </Card>
    </div>
  )
}

// ── Step 3 — Media & gallery ────────────────────────────────────────────────

const MEDIA_CHECKLIST = [
  { label: 'Exterior / entrance', required: true,  hint: 'Set as cover' },
  { label: 'Lobby or reception',  required: true,  hint: 'Required' },
  { label: 'Standard room',       required: true,  hint: 'Required' },
  { label: 'Bathroom',            required: true,  hint: 'Required' },
  { label: 'Amenity / view',      required: false, hint: 'Recommended' },
  { label: 'Food or cafe area',   required: false, hint: 'Optional' },
]

export function Step3Policies() {
  const stored = useOnboardingStore((s) => s.stepData[3] as { reviewerNotes?: string; uploadedCount?: number } | undefined)
  const [uploadedCount, setUploadedCount] = useState(stored?.uploadedCount ?? 0)
  const [reviewerNotes, setReviewerNotes] = useState(stored?.reviewerNotes ?? '')
  const { triggerSave } = useOnboardingAutoSave(3)

  useEffect(() => {
    triggerSave({ uploadedCount, reviewerNotes })
  }, [uploadedCount, reviewerNotes])

  return (
    <div className="space-y-6">
      <StepHeader step={3} title="Media & gallery" subtitle="High-quality photos increase bookings by 40%. Add at least 5 clear images." />
      <TwoCol side={
        <SideNote icon={Camera} title="Photo quality rules" body="Use landscape orientation, natural daylight, no watermarks, no text overlays, no misleading crops. Minimum 1200px wide." />
      }>
        <div className="space-y-6">
          <div
            className="rounded-[12px] border-2 border-dashed border-primary-200 bg-primary-50 p-8 text-center cursor-pointer hover:bg-primary-100 transition-colors"
            onClick={() => { setUploadedCount((p) => p + 1); toast.success('Photo uploaded successfully') }}
          >
            <ImagePlus className="mx-auto text-primary-600 mb-3" size={28} aria-hidden />
            <p className="font-semibold text-navy-900">Drag photos here or click to upload</p>
            <p className="mt-1 text-sm text-navy-500">JPG or PNG · Min 1200px wide · Max 10 MB each</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              <Plus size={14} /> Choose photos
            </div>
          </div>

          {uploadedCount > 0 && (
            <div className="flex items-center gap-2 rounded-[10px] bg-success-50 border border-success-500 px-4 py-3">
              <CheckCircle size={16} className="text-success-700 shrink-0" />
              <p className="text-sm font-semibold text-success-700">{uploadedCount} photo{uploadedCount > 1 ? 's' : ''} uploaded</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-navy-900">Gallery checklist</h2>
              <Badge variant={uploadedCount >= 4 ? 'green' : 'amber'}>{Math.min(uploadedCount, 4)} / 4 required</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MEDIA_CHECKLIST.map(({ label, required, hint }, i) => (
                <div key={label} className="flex items-center justify-between rounded-[10px] border border-border p-3 bg-white">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{label}</p>
                    <p className="text-xs text-navy-500">{i < uploadedCount ? 'Uploaded ✓' : required ? 'Not uploaded yet' : hint}</p>
                  </div>
                  <Badge variant={i < uploadedCount ? 'green' : required ? 'amber' : 'grey'}>
                    {i < uploadedCount ? 'Ready' : hint}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <FieldWrapper label="Photo notes for reviewer" hint="Optional — mention renovations, seasonal views, or anything the photos don't show.">
            <Textarea
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              rows={2}
              placeholder="E.g. Rooftop pool photo is from April 2026 post-renovation."
            />
          </FieldWrapper>
        </div>
      </TwoCol>
    </div>
  )
}

// ── Step 4 — Rooms & pricing ────────────────────────────────────────────────

const BED_TYPES = ['King', 'Queen', 'Twin', 'Double', 'Bunk', 'Sofa bed']

const ROOM_AMENITIES = [
  'AC', 'Non-AC', 'TV', 'Mini-bar', 'Balcony', 'City view', 'Bathtub',
  'Attached bath', 'Safe', 'Work desk', 'Kitchenette',
]

const roomSchema = z.object({
  id:           z.string(),
  name:         z.string().min(2, 'Required'),
  count:        z.number().min(1, 'At least 1 room'),
  maxOccupancy: z.number().min(1).max(10),
  bedType:      z.string().min(1, 'Select bed type'),
  sizeNote:     z.string().optional(),
  amenities:    z.array(z.string()),
  hourlyRate:   z.number().min(50).optional(),
  fulldayRate:  z.number().min(500).optional(),
})

const step4Schema = z.object({
  rooms:         z.array(roomSchema).min(1, 'Add at least one room type'),
  smartPricing:  z.boolean(),
})
type Step4Data = z.infer<typeof step4Schema>
type RoomData = z.infer<typeof roomSchema>

const DEFAULT_ROOMS: RoomData[] = [
  { id: 'r1', name: 'Standard room', count: 8, maxOccupancy: 2, bedType: 'King', sizeNote: '220 sqft', amenities: ['AC', 'TV', 'Attached bath'], hourlyRate: 299, fulldayRate: 2999 },
]

function tiers(base: number) {
  return [base, Math.round(base * 3.4), Math.round(base * 6.5), Math.round(base * 13)].map(formatINR)
}

function RoomCard({ room, onUpdate, onDelete, bookingPolicy }: {
  room: RoomData
  onUpdate: (r: RoomData) => void
  onDelete: () => void
  bookingPolicy: string
}) {
  const [open, setOpen] = useState(false)
  const toggleAmenity = (a: string) => {
    onUpdate({ ...room, amenities: room.amenities.includes(a) ? room.amenities.filter((x) => x !== a) : [...room.amenities, a] })
  }

  return (
    <div className="rounded-(--radius-lg) border border-border bg-white shadow-1 overflow-hidden">
      <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div>
          <p className="font-display font-bold text-navy-900">{room.name}</p>
          <p className="text-sm text-navy-500 mt-0.5">
            {room.count} rooms · {room.bedType} bed · Max {room.maxOccupancy} guests
            {room.hourlyRate ? ` · ₹${room.hourlyRate}/hr` : ''}
            {room.fulldayRate ? ` · ₹${room.fulldayRate}/day` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1.5 text-error-400 hover:text-error-600 rounded">
            <Trash2 size={14} />
          </button>
          <ChevronDown size={16} className={cn('text-navy-400 transition-transform', open && 'rotate-180')} />
        </div>
      </div>

      {open && (
        <div className="border-t border-border p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FieldWrapper label="Room name">
              <Input value={room.name} onChange={(e) => onUpdate({ ...room, name: e.target.value })} />
            </FieldWrapper>
            <FieldWrapper label="Total rooms">
              <Input type="number" min={1} value={room.count} onChange={(e) => onUpdate({ ...room, count: Number(e.target.value) })} />
            </FieldWrapper>
            <FieldWrapper label="Max occupancy">
              <Input type="number" min={1} max={10} value={room.maxOccupancy} onChange={(e) => onUpdate({ ...room, maxOccupancy: Number(e.target.value) })} />
            </FieldWrapper>
            <FieldWrapper label="Bed type">
              <Select value={room.bedType} onChange={(e) => onUpdate({ ...room, bedType: e.target.value })}>
                {BED_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </FieldWrapper>
          </div>

          {/* Pricing */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(bookingPolicy === 'hourly' || bookingPolicy === 'both') && (
              <div>
                <FieldWrapper label="Hourly rate (₹/hr)" hint="Base rate for short stays" required>
                  <Input type="number" min={50} value={room.hourlyRate ?? ''} onChange={(e) => onUpdate({ ...room, hourlyRate: Number(e.target.value) })} prefix="₹" />
                </FieldWrapper>
                {room.hourlyRate && (
                  <div className="mt-2">
                    <p className="text-xs text-navy-500 mb-1.5">Auto-tier preview</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['1h','4h','8h','24h'].map((slot, i) => (
                        <div key={slot} className="rounded-[8px] bg-navy-50 px-2 py-1.5 text-center">
                          <p className="text-[10px] text-navy-400">{slot}</p>
                          <p className="text-xs font-bold text-navy-900">{tiers(room.hourlyRate!)[i]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(bookingPolicy === 'fullday' || bookingPolicy === 'both') && (
              <FieldWrapper label="Full-day rate (₹/24h)" hint="Rate for overnight or full-day stays" required>
                <Input type="number" min={500} value={room.fulldayRate ?? ''} onChange={(e) => onUpdate({ ...room, fulldayRate: Number(e.target.value) })} prefix="₹" />
              </FieldWrapper>
            )}
          </div>

          {/* Room amenities */}
          <div>
            <p className="text-sm font-semibold text-navy-700 mb-2">Room amenities</p>
            <div className="flex flex-wrap gap-2">
              {ROOM_AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    room.amenities.includes(a) ? 'bg-primary-600 border-primary-600 text-white' : 'border-border text-navy-600 hover:border-navy-400'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Step4LegalTax() {
  const stored = useOnboardingStore((s) => s.stepData[4] as Partial<Step4Data> | undefined)
  const step2Data = useOnboardingStore((s) => s.stepData[2] as Partial<Step2Data> | undefined)
  const step1Data = useOnboardingStore((s) => s.stepData[1] as Partial<Step1Data> | undefined)
  const bookingPolicy = step2Data?.bookingPolicy ?? 'both'
  const category = step1Data?.propertyCategory ?? 'mid'
  const commission = COMMISSION_BY_CATEGORY[category] ?? PLATFORM_COMMISSION

  const [rooms, setRooms] = useState<RoomData[]>(stored?.rooms as RoomData[] ?? DEFAULT_ROOMS)
  const [smartPricing, setSmartPricing] = useState(stored?.smartPricing ?? true)
  const { triggerSave } = useOnboardingAutoSave(4)

  useEffect(() => { triggerSave({ rooms, smartPricing } as Record<string, unknown>) }, [JSON.stringify(rooms), smartPricing])

  const addRoom = () => {
    const newRoom: RoomData = {
      id: `r${Date.now()}`,
      name: 'New room type',
      count: 4,
      maxOccupancy: 2,
      bedType: 'King',
      sizeNote: '',
      amenities: ['AC', 'TV'],
      hourlyRate: bookingPolicy !== 'fullday' ? 399 : undefined,
      fulldayRate: bookingPolicy !== 'hourly' ? 3999 : undefined,
    }
    setRooms((prev) => [...prev, newRoom])
  }

  const exampleRoom = rooms[0]
  const exampleNet = exampleRoom?.hourlyRate ? Math.round(exampleRoom.hourlyRate * (1 - commission / 100)) : null

  return (
    <div className="space-y-6">
      <StepHeader step={4} title="Rooms & pricing" subtitle="Define your room inventory with hourly and/or full-day rates. Smart tiers auto-generate." />

      {/* Commission transparency */}
      <div className="rounded-(--radius-lg) border border-primary-200 bg-primary-50 p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-600 text-white">
          <IndianRupee size={18} />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-navy-900">Commission — {commission}% platform fee</p>
          <p className="text-sm text-navy-600 mt-1">
            Stayflex charges <strong>{commission}%</strong> on each completed booking.
            {exampleNet && exampleRoom?.hourlyRate && (
              <> At <strong>₹{exampleRoom.hourlyRate}/hr</strong>, you receive <strong>₹{exampleNet}/hr</strong> net.</>
            )}
            {' '}Settled D+1 directly to your bank account.
          </p>
          <p className="text-xs text-navy-400 mt-1">
            Rate based on your <strong className="capitalize">{category}</strong> property category. Custom rates can be set by Stayflex admin.
          </p>
        </div>
      </div>

      {/* Room cards */}
      <div className="space-y-4">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            bookingPolicy={bookingPolicy}
            onUpdate={(updated) => setRooms((prev) => prev.map((r) => r.id === room.id ? updated : r))}
            onDelete={() => setRooms((prev) => prev.filter((r) => r.id !== room.id))}
          />
        ))}
        <Button variant="outline" type="button" onClick={addRoom} className="w-full">
          <Plus size={15} className="mr-1" /> Add room type
        </Button>
      </div>

      {/* Smart pricing */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="font-display font-bold text-navy-900">Smart pricing</p>
            <p className="text-sm text-navy-600 mt-1">
              Stayflex automatically adjusts your prices up to ±20% based on real-time demand, day-of-week, and local events.
              Owners using smart pricing earn <strong>18% more</strong> on average.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={smartPricing}
              onChange={(e) => { setSmartPricing(e.target.checked); toast.success(`Smart pricing ${e.target.checked ? 'enabled' : 'disabled'}`) }}
              className="h-5 w-5 accent-primary-600"
            />
            <span className="text-sm font-semibold text-navy-700">{smartPricing ? 'On' : 'Off'}</span>
          </label>
        </div>
      </Card>
    </div>
  )
}

// ── Step 5 — Documents & KYC ────────────────────────────────────────────────

export function Step5Documents() {
  const step1Data = useOnboardingStore((s) => s.stepData[1] as Partial<Step1Data> | undefined)
  const entity = step1Data?.businessEntity ?? 'individual'
  const hasGST = !!(step1Data?.gstNumber)
  const isCompany = entity === 'llp' || entity === 'pvtltd'

  const stored = useOnboardingStore((s) => s.stepData[5] as Record<string, boolean> | undefined)
  const [docs, setDocs] = useState<Record<string, boolean>>(stored ?? {})
  const { triggerSave } = useOnboardingAutoSave(5)
  useEffect(() => { triggerSave(docs) }, [JSON.stringify(docs)])

  const DOCS = [
    { id: 'pan',       label: 'PAN card',                    required: true,    show: true },
    { id: 'aadhaar',   label: 'Aadhaar card',                required: !isCompany, show: !isCompany },
    { id: 'ownership', label: 'Property ownership / lease',  required: true,    show: true },
    { id: 'cheque',    label: 'Cancelled cheque',            required: true,    show: true },
    { id: 'gst_cert',  label: 'GST certificate',             required: hasGST,  show: hasGST },
    { id: 'fire_noc',  label: 'Fire NOC or local license',   required: false,   show: true },
    { id: 'trade',     label: 'Trade license',               required: isCompany, show: isCompany },
    { id: 'director',  label: 'Director / Partner ID proof', required: isCompany, show: isCompany },
  ].filter((d) => d.show)

  const required = DOCS.filter((d) => d.required)
  const uploaded = required.filter((d) => docs[d.id])

  return (
    <div className="space-y-6">
      <StepHeader step={5} title="Documents & KYC" subtitle="Upload identity, ownership, tax, and safety documents. All files are encrypted and GDPR-compliant." />
      <TwoCol side={
        <div className="space-y-4">
          <SideNote icon={Shield} title="Data security" body="Your documents are encrypted at rest using AES-256. Only our KYC team can access them during verification." />
          <div className="rounded-(--radius-lg) border border-border bg-white p-4">
            <p className="text-sm font-semibold text-navy-900 mb-2">Required for {entity === 'individual' ? 'individuals' : 'companies'}</p>
            <p className="text-xs text-navy-500">
              {isCompany
                ? 'Company registrations need company PAN, GST, director IDs, and ownership proof.'
                : 'Individual listings need personal PAN, Aadhaar, and property ownership documents.'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-navy-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${required.length ? (uploaded.length / required.length) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-navy-700">{uploaded.length}/{required.length}</span>
            </div>
          </div>
        </div>
      }>
        <div className="grid gap-4 md:grid-cols-2">
          {DOCS.map(({ id, label, required: req }) => (
            <div key={id} className="space-y-1">
              <DocumentUploader
                label={label + (req ? ' *' : '')}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSizeMB={10}
                required={req}
                onUpload={async (file) => {
                  await uploadDocument(file, id)
                  setDocs((prev) => ({ ...prev, [id]: true }))
                  toast.success(`${label} uploaded`)
                }}
              />
            </div>
          ))}
        </div>
      </TwoCol>
    </div>
  )
}

// ── Step 6 — Bank & payouts ─────────────────────────────────────────────────

const step6Schema = z.object({
  accountHolderName:    z.string().min(2, 'Required'),
  accountNumber:        z.string().min(9, 'Invalid account number').max(18),
  ifscCode:             z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
  bankName:             z.string().min(2, 'Required'),
  accountType:          z.enum(['savings', 'current']),
  settlementPreference: z.enum(['d1', 'weekly']),
  tdsConsent:           z.boolean(),
})
type Step6Data = z.infer<typeof step6Schema>

export function Step6BankAccount() {
  const stored = useOnboardingStore((s) => s.stepData[6] as Partial<Step6Data> | undefined)
  const { register, watch, setValue, formState: { errors } } = useForm<Step6Data>({
    resolver: zodResolver(step6Schema),
    defaultValues: {
      accountHolderName: stored?.accountHolderName ?? '',
      accountNumber: stored?.accountNumber ?? '',
      ifscCode: stored?.ifscCode ?? '',
      bankName: stored?.bankName ?? '',
      accountType: stored?.accountType ?? 'savings',
      settlementPreference: stored?.settlementPreference ?? 'd1',
      tdsConsent: stored?.tdsConsent ?? false,
    },
  })

  const values = watch()
  const { triggerSave } = useOnboardingAutoSave(6)
  useEffect(() => { triggerSave(values as Record<string, unknown>) }, [JSON.stringify(values)])

  const [ifscStatus, setIfscStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [bankBranch, setBankBranch] = useState('')
  const [pennyStatus, setPennyStatus] = useState<'idle' | 'loading' | 'ok'>('idle')

  const lookupIFSC = async () => {
    const code = watch('ifscCode').toUpperCase()
    if (!code.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) return
    setIfscStatus('loading')
    try {
      const res = await verifyIFSC(code)
      setValue('bankName', res.bank)
      setBankBranch(`${res.branch}, ${res.city}`)
      setIfscStatus('ok')
    } catch {
      setIfscStatus('error')
      setValue('bankName', '')
    }
  }

  const runPennyDrop = async () => {
    setPennyStatus('loading')
    try {
      const res = await pennyDrop()
      if (res.success) { setPennyStatus('ok'); toast.success(res.message) }
    } catch {
      toast.error('Penny drop failed. Check account details.')
      setPennyStatus('idle')
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader step={6} title="Bank & payouts" subtitle="Add the bank account where your D+1 settlements will land. Must match the verified owner or business name." />
      <TwoCol side={
        <div className="space-y-4">
          <SideNote icon={Shield} title="Bank-grade security" body="Your account details are encrypted. We run a ₹1 penny drop to confirm the account is real before your first payout." />
          <div className="rounded-(--radius-lg) border border-border bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-navy-900">Settlement timeline</p>
            <div className="space-y-2 text-xs text-navy-600">
              <div className="flex gap-2"><span className="text-primary-600 font-bold">D+1</span><span>Payment lands next business day after checkout</span></div>
              <div className="flex gap-2"><span className="text-navy-400 font-bold">TDS</span><span>1% TDS deducted when monthly payouts exceed ₹30,000</span></div>
              <div className="flex gap-2"><span className="text-navy-400 font-bold">GST</span><span>Commission invoice issued if GSTIN provided in Step 1</span></div>
            </div>
          </div>
        </div>
      }>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrapper label="Account holder name" required error={errors.accountHolderName?.message} hint="Must match PAN / GST records exactly">
              <Input {...register('accountHolderName')} error={!!errors.accountHolderName} />
            </FieldWrapper>
            <FieldWrapper label="Account type" required>
              <Select {...register('accountType')}>
                <option value="savings">Savings account</option>
                <option value="current">Current account</option>
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Account number" required error={errors.accountNumber?.message} className="sm:col-span-2">
              <Input {...register('accountNumber')} type="password" className="font-mono" error={!!errors.accountNumber} />
            </FieldWrapper>

            <FieldWrapper label="IFSC code" required error={errors.ifscCode?.message}>
              <div className="flex gap-2">
                <Input
                  {...register('ifscCode')}
                  className="font-mono uppercase"
                  placeholder="HDFC0001234"
                  error={!!errors.ifscCode}
                  onBlur={lookupIFSC}
                />
                <Button type="button" variant="outline" size="sm" onClick={lookupIFSC} disabled={ifscStatus === 'loading'}>
                  {ifscStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </Button>
              </div>
              {ifscStatus === 'ok' && <p className="text-xs text-success-700 mt-1">✓ {bankBranch}</p>}
              {ifscStatus === 'error' && <p className="text-xs text-error-500 mt-1">IFSC not found. Try HDFC0001234, SBIN0001234, or ICIC0001234</p>}
            </FieldWrapper>

            <FieldWrapper label="Bank name" required error={errors.bankName?.message}>
              <Input {...register('bankName')} placeholder="Auto-filled from IFSC" error={!!errors.bankName} />
            </FieldWrapper>
          </div>

          {/* Penny drop */}
          <div className={cn(
            'rounded-[12px] border p-4 flex items-center gap-4 transition-colors',
            pennyStatus === 'ok' ? 'border-success-500 bg-success-50' : 'border-border bg-navy-50'
          )}>
            <div className="flex-1">
              <p className="font-semibold text-navy-900 text-sm">Verify bank account</p>
              <p className="text-xs text-navy-500 mt-0.5">We deposit ₹1 to confirm the account is active. It's returned within 24 hours.</p>
            </div>
            {pennyStatus === 'ok'
              ? <Badge variant="green"><CheckCircle size={12} className="mr-1" />Verified</Badge>
              : <Button type="button" size="sm" variant="outline" onClick={runPennyDrop} disabled={pennyStatus === 'loading'}>
                  {pennyStatus === 'loading' ? <><Loader2 size={12} className="animate-spin mr-1" />Verifying…</> : 'Verify now'}
                </Button>
            }
          </div>

          <FieldWrapper label="Settlement preference">
            <Select {...register('settlementPreference')} className="w-full sm:w-80">
              <option value="d1">D+1 automatic — next business day after checkout</option>
              <option value="weekly">Weekly consolidated — every Monday</option>
            </Select>
          </FieldWrapper>

          {/* TDS consent */}
          <label className="flex items-start gap-3 cursor-pointer rounded-[10px] border border-border p-4 hover:bg-navy-50">
            <input {...register('tdsConsent')} type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-600 shrink-0" />
            <span className="text-sm text-navy-600">
              I understand that TDS of 1% will be deducted at source when my monthly settlements exceed ₹30,000, as per Indian tax regulations.
              A Form 16A will be issued quarterly.
            </span>
          </label>
        </div>
      </TwoCol>
    </div>
  )
}

// ── Step 7 — Review & submit ────────────────────────────────────────────────

export function Step7ReviewSubmit() {
  const stepData = useOnboardingStore((s) => s.stepData)
  const s1 = stepData[1] as Partial<Step1Data> | undefined
  const s2 = stepData[2] as Partial<Step2Data> | undefined
  const s4 = stepData[4] as { rooms?: RoomData[]; smartPricing?: boolean } | undefined
  const s6 = stepData[6] as Partial<Step6Data> | undefined

  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const commission = COMMISSION_BY_CATEGORY[s1?.propertyCategory ?? 'mid'] ?? PLATFORM_COMMISSION

  const CHECKLIST = [
    {
      step: 1, icon: Home, label: 'Owner identity',
      summary: s1?.ownerName ? `${s1.ownerName} · ${s1.businessEntity?.toUpperCase()} · ${s1.propertyCategory?.toUpperCase()} category` : 'Not completed',
      ok: !!(s1?.ownerName && s1?.phone && s1?.email),
    },
    {
      step: 2, icon: MapPin, label: 'Property info & amenities',
      summary: s2?.propertyName
        ? `${s2.propertyName} · ${s2.city} · ${s2.amenities?.length ?? 0} amenities · ${s2.bookingPolicy?.replace('_', ' ')}`
        : 'Not completed',
      ok: !!(s2?.propertyName && s2?.city && (s2?.amenities?.length ?? 0) >= 3 && s2?.bookingPolicy),
    },
    {
      step: 3, icon: Camera, label: 'Media & gallery',
      summary: 'Photos uploaded',
      ok: true,
    },
    {
      step: 4, icon: IndianRupee, label: 'Rooms & pricing',
      summary: s4?.rooms?.length
        ? `${s4.rooms.length} room type${s4.rooms.length > 1 ? 's' : ''} · Commission ${commission}%`
        : 'Not completed',
      ok: !!(s4?.rooms?.length),
    },
    {
      step: 5, icon: FileText, label: 'Documents & KYC',
      summary: 'Documents uploaded',
      ok: true,
    },
    {
      step: 6, icon: CreditCard, label: 'Bank & payouts',
      summary: s6?.bankName
        ? `${s6.accountHolderName} · ${s6.bankName} · ${s6.settlementPreference === 'd1' ? 'D+1 settlement' : 'Weekly settlement'}`
        : 'Not completed',
      ok: !!(s6?.accountHolderName && s6?.bankName),
    },
  ]

  const allOk = CHECKLIST.every((c) => c.ok)

  const handleSubmit = async () => {
    if (!agreed) { toast.error('Please accept the declaration before submitting'); return }
    const draftId = useOnboardingStore.getState().draftId
    if (!draftId) { toast.error('No draft found — please complete the onboarding steps first.'); return }
    setSubmitting(true)
    try {
      await submitOnboarding(draftId)
      toast.success('Application submitted! Verification takes 24 hours.')
      // navigate to status — WizardShell will handle this via its Continue button
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const estimatedEarning = (() => {
    const rooms = s4?.rooms ?? []
    if (!rooms.length) return null
    const avgHourly = rooms.reduce((sum, r) => sum + (r.hourlyRate ?? 0), 0) / rooms.filter((r) => r.hourlyRate).length
    const net = avgHourly * (1 - commission / 100)
    return { gross: Math.round(avgHourly), net: Math.round(net) }
  })()

  return (
    <div className="space-y-6">
      <StepHeader step={7} title="Review & submit" subtitle="One final check before the Stayflex verification team reviews your listing." />

      {/* Earnings summary */}
      {estimatedEarning && (
        <div className="rounded-(--radius-lg) border border-primary-200 bg-primary-50 p-5">
          <p className="font-display font-bold text-navy-900 mb-1">Estimated earnings preview</p>
          <p className="text-sm text-navy-600">
            At an average hourly rate of <strong>₹{estimatedEarning.gross}/hr</strong> with {commission}% commission,
            you receive <strong>₹{estimatedEarning.net}/hr</strong> per booking. At 70% occupancy that's approximately{' '}
            <strong>₹{formatINR(Math.round(estimatedEarning.net * 6 * 22))}/month</strong>.
          </p>
        </div>
      )}

      {/* Checklist */}
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          {CHECKLIST.map(({ step, icon: Icon, label, summary, ok }) => (
            <div
              key={label}
              className={cn(
                'flex items-start gap-3 rounded-[10px] border p-4 cursor-pointer hover:bg-navy-50 transition-colors',
                ok ? 'border-success-200' : 'border-warning-400 bg-warning-50'
              )}
              onClick={() => window.location.href = `/owner/onboarding/step${step}`}
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', ok ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-600')}>
                {ok ? <CheckCircle size={18} /> : <Icon size={18} />}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-navy-900 text-sm">{label}</p>
                <p className="text-xs text-navy-500 truncate mt-0.5">{summary}</p>
                {!ok && <p className="text-[11px] text-warning-600 font-semibold mt-0.5">↗ Click to complete</p>}
              </div>
            </div>
          ))}

          <div className="flex items-start gap-3 rounded-[10px] border border-border p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-navy-50 text-navy-500">
              <Upload size={18} />
            </span>
            <div>
              <p className="font-semibold text-navy-900 text-sm">What happens next?</p>
              <p className="text-xs text-navy-500 mt-0.5">Verification: 24–48 hours · Email notification · Live within 72 hours</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Declaration */}
      <div className="rounded-(--radius-lg) border border-border bg-white p-5 shadow-1">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-primary-600 shrink-0"
          />
          <span className="text-sm text-navy-700 leading-relaxed">
            I confirm that all information provided is accurate and up-to-date. I am the legal owner or authorised representative of this property
            and I accept Stayflex's{' '}
            <a href="#" className="text-primary-600 font-semibold hover:underline">Partner Terms</a>,{' '}
            <a href="#" className="text-primary-600 font-semibold hover:underline">Privacy Policy</a>, and{' '}
            <a href="#" className="text-primary-600 font-semibold hover:underline">Commission Schedule</a>.
          </span>
        </label>

        {!allOk && (
          <div className="mt-4 rounded-[10px] bg-warning-50 border border-warning-400 px-4 py-3 text-sm text-warning-600 font-medium">
            ⚠️ Some sections are incomplete. You can still submit, but verification may take longer.
          </div>
        )}

        <Button
          className="w-full mt-4"
          size="lg"
          disabled={!agreed || submitting}
          loading={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit for review →'}
        </Button>
      </div>
    </div>
  )
}
