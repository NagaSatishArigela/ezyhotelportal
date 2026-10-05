import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { PropertyDetailsFields } from '@/components/owner/PropertyDetailsFields'
import { AmenityPicker } from '@/components/owner/AmenityPicker'
import { amenitiesForProperty, normalizeAmenity } from '@/lib/amenity-catalog'
import { detailGroups, propertyDetailsErrors, PROPERTY_TYPE_OPTIONS, type PropertyDetails } from '@/lib/property-details'
import { mapStep1, mapStep3, mapStep5 } from '@/lib/onboarding-mapping'
import { restorePortalSteps } from '@/lib/onboarding-restore'
import { documentRequirements } from '@/lib/document-requirements'

describe('document property requirements', () => {
  it('presents stay types in the requested service order', () => {
    expect(PROPERTY_TYPE_OPTIONS.map(type => type.label)).toEqual([
      'Hotel', 'Resort', 'Villa', 'Guest House', 'Farm House', 'Homestay',
      'PG', 'Lodge', 'Dormitory', 'Banquet/Convention Hall', 'Other',
    ])
  })

  it.each(['guest_house', 'lodge', 'dormitory'])('maps %s through the server basics contract', type => {
    expect(mapStep1({ 2: { propertyName: 'Stay', propertyType: type } }).propertyType).toBe(type)
    expect(amenitiesForProperty(type).length).toBeGreaterThan(0)
  })

  it.each([
    ['hotel', ['power_backup', 'travel_desk', 'tv', 'geyser', 'balcony', 'group_parties', 'doctor_on_call', 'first_aid']],
    ['resort', ['pets']],
    ['homestay', ['kitchen', 'living_room', 'dining_area']],
    ['villa', ['garden', 'children_area', 'outdoor_games', 'indoor_games', 'music_system']],
    ['pg', ['mattress', 'bed', 'cupboard', 'study_chair', 'washing_machine', 'laundry', 'housekeeping', 'security', 'warden']],
    ['farm', ['pool', 'campfire', 'music_system', 'swimming_well', 'security', 'rain_dance', 'tree_swing']],
    ['banquet', ['fans', 'stage', 'led_screen', 'projector', 'sound_system', 'microphones', 'dj_facility', 'dance_floor', 'generator_backup', 'power_backup', 'charging_points', 'fire_safety_equipment', 'emergency_exit', 'first_aid']],
  ])('offers the document amenities for %s', (type, required) => {
    expect(amenitiesForProperty(type as string).map(item => item.id)).toEqual(expect.arrayContaining(required as string[]))
    expect(amenitiesForProperty(type as string).map(item => item.id)).not.toContain('rooftop')
  })

  it('retains legacy aliases and does not discard selected rooftop silently', () => {
    expect(normalizeAmenity('WiFi')).toBe('wifi')
    const selected = ['WiFi', 'rooftop']
    render(<AmenityPicker propertyType="hotel" value={selected} onChange={() => undefined} />)
    expect(screen.getByText('Previously selected amenities')).toBeInTheDocument()
  })

  it('preserves subtype, host answers and food selections through save and restore', () => {
    const details = { homestayType: 'Entire Home', hostLivesOnProperty: false, food: ['Breakfast', 'Vegetarian'] }
    const step1 = mapStep1({ 2: { propertyType: 'homestay', detailsByType: { homestay: details } } })
    const restored = restorePortalSteps({ propertyId: 'p', status: 'draft', draftStep: 1, draftData: { step1 }, compliance: null })
    expect(restored[2]?.detailsByType).toEqual({ homestay: details })
  })

  it('enforces PG / banquet policy and drops unsupported rates', () => {
    const rooms = [{ type: 'ac', count: 1, hourlyRate: 299, fulldayRate: 2999 }]
    expect(mapStep1({ 2: { propertyType: 'pg', bookingPolicy: 'both' } }).bookingPolicy).toBe('fullday')
    expect(mapStep1({ 2: { propertyType: 'banquet', bookingPolicy: 'both' } }).bookingPolicy).toBe('hourly')
    expect(mapStep3({ 2: { propertyType: 'pg' }, 4: { rooms } }).rooms?.[0].hourlyRate).toBeUndefined()
    expect(mapStep3({ 2: { propertyType: 'banquet' }, 4: { rooms } }).rooms?.[0].fulldayRate).toBeUndefined()
  })

  it('preserves multi-select changes and explicit No values in the UI', () => {
    function Form() {
      const [value, setValue] = useState<PropertyDetails>({})
      return <><PropertyDetailsFields propertyType="homestay" value={value} onChange={setValue} /><output data-testid="saved">{JSON.stringify(value)}</output></>
    }
    render(<Form />)
    fireEvent.click(screen.getByLabelText('Breakfast'))
    fireEvent.click(screen.getByLabelText('Dinner'))
    fireEvent.change(screen.getByLabelText('Host available?'), { target: { value: 'false' } })
    expect(JSON.parse(screen.getByTestId('saved').textContent ?? '{}')).toEqual({ food: ['Breakfast', 'Dinner'], hostAvailable: false })
    expect(screen.queryByText('Resort activities')).not.toBeInTheDocument()
  })

  it('validates field choices and policy ranges', () => {
    expect(propertyDetailsErrors('pg', { minimumStay: 30, maximumStay: 10 })).not.toHaveLength(0)
    expect(propertyDetailsErrors('villa', { villaType: 'Beach Resort' })).not.toHaveLength(0)
    expect(propertyDetailsErrors('resort', { resortActivities: ['Boating', 'Boating'] })).not.toHaveLength(0)
    expect(propertyDetailsErrors('homestay', { hostAvailable: false })).toEqual([])
    expect(detailGroups('banquet').map(group => group.title)).toEqual(['Event type', 'Capacity', 'Seating & furniture', 'Catering', 'Decoration', 'Parking', 'Guest rooms / changing rooms', 'Other facilities'])
  })

  it.each(['individual', 'sole_proprietor', 'partnership', 'llp', 'private_limited', 'public_limited'])('uses the new KYC requirements for %s', entity => {
    const docs = documentRequirements(entity, true)
    expect(docs.filter(doc => doc.required).map(doc => doc.type)).toEqual(expect.arrayContaining(['id_proof', 'id_proof_back', 'trade_license']))
    expect(docs.find(doc => doc.type === 'gstin_certificate')?.required).toBe(false)
    expect(docs.find(doc => doc.type === 'udyam_certificate')?.required).toBe(false)
    expect(docs.find(doc => doc.type === 'owner_photo')).toBeDefined()
  })

  it.each(['cash_credit', 'other'])('maps %s bank accounts and the new document types', accountType => {
    const documents = [{ type: 'id_proof_back', url: 'https://files.test/back.png' }, { type: 'udyam_certificate', url: 'https://files.test/udyam.pdf' }]
    expect(mapStep5({ 5: { documents }, 6: { accountType } })).toMatchObject({ accountType, documents })
  })
})
