import { api } from './api'
import { createPropertyDraft, getPropertyDraft, type PropertyDraft } from './portal-api'
import { restorePortalSteps } from './onboarding-restore'
import { completedOnboardingSteps } from './onboarding-validation'
import { withMembership } from './hotel-access'
import { queryClient } from './queryClient'
import { useAuthStore } from '@/store/auth.store'
import { useOnboardingStore } from '@/store/onboarding.store'
import type { HotelMembership } from '@/types'
import type { PortalStepData } from './onboarding-mapping'

export function selectApplicationStatus(propertyId: string, status: string) {
  const user = useAuthStore.getState().user
  if (!user) return
  const old = user.memberships?.find(m => m.propertyId === propertyId)
  // A status response never grants operational permissions; only /me/properties does.
  const membership: HotelMembership = { propertyId, name: old?.name ?? 'Property application', status,
    isActive: old?.isActive ?? true, isApplicant: true, role: null, roleName: null, permissions: [] }
  const memberships = [...(user.memberships ?? []).filter(m => m.propertyId !== propertyId), membership]
  useAuthStore.getState().setUser(withMembership(user, membership, memberships))
  // Cancel older reads before publishing the mutation result into the shared cache.
  void queryClient.cancelQueries({ queryKey: ['hotel-memberships', user.id] })
  queryClient.setQueryData(['hotel-memberships', user.id], memberships)
  void queryClient.invalidateQueries({ queryKey: ['hotel-memberships', user.id] })
}

let creating: Promise<string> | undefined
export function ensureApplicationDraft(): Promise<string> {
  const state = useOnboardingStore.getState()
  if (state.draftId) return Promise.resolve(state.draftId)
  if (creating) return creating
  const user = useAuthStore.getState().user
  if (!user) return Promise.reject(new Error('Please sign in again'))
  creating = createPropertyDraft().then(propertyId => {
    if (useAuthStore.getState().user?.id !== user.id || useOnboardingStore.getState().selectionVersion !== state.selectionVersion || useOnboardingStore.getState().draftId) throw new Error('Application changed while saving')
    useOnboardingStore.setState({ ownerId: user.id, draftId: propertyId, restoredDraftId: propertyId })
    selectApplicationStatus(propertyId, 'draft')
    return propertyId
  }).finally(() => { creating = undefined })
  return creating
}

export async function restoreApplication(propertyId: string): Promise<PropertyDraft | undefined> {
  const user = useAuthStore.getState().user
  if (!user || user.propertyId !== propertyId) throw new Error('Select the application first')
  const initial = useOnboardingStore.getState()
  if (initial.restoredDraftId === propertyId && initial.ownerId === user.id) return
  const draft = await getPropertyDraft(propertyId)
  const { data: snapshot } = await api.get<PortalStepData>('/properties/' + propertyId + '/application-state')
  if (draft.propertyId !== propertyId) throw new Error('Application response did not match the selected hotel')
  if (useAuthStore.getState().user?.id !== user.id || useAuthStore.getState().user?.propertyId !== propertyId) throw new Error('Application changed while loading')
  const state = useOnboardingStore.getState()
  const same = state.ownerId === user.id && state.draftId === propertyId
  const remote = restorePortalSteps(draft)
  const stepData: PortalStepData = {}
  for (const step of [1, 2, 3, 4, 5, 6, 7] as const) {
    // Keep unsaved browser fields only when they belong to this same user's application.
    stepData[step] = { ...remote[step], ...snapshot[step], ...(same ? state.stepData[step] : {}) }
  }
  stepData[1] = { phone: user.phone, email: user.email, ...stepData[1] }
  const savedCompliance = draft.compliance
  const useSavedCompliance = !!savedCompliance && !(same && state.savedCompliance && !state.useSavedCompliance)
  useOnboardingStore.setState({ ownerId: user.id, draftId: propertyId, restoredDraftId: propertyId,
    stepData, savedCompliance, useSavedCompliance, onBeforeNext: null,
    completedSteps: completedOnboardingSteps(stepData, useSavedCompliance ? savedCompliance : false), currentStep: same ? state.currentStep : 1 })
  selectApplicationStatus(propertyId, draft.status)
  return draft
}

export async function submitApplication() {
  const user = useAuthStore.getState().user
  const state = useOnboardingStore.getState()
  if (!user || !state.draftId || user.propertyId !== state.draftId) throw new Error('Select the application before submitting')
  const id = state.draftId
  const path = '/properties/' + id + (user.onboardingStatus === 'revision_requested' ? '/revise' : '/submit')
  const response = user.onboardingStatus === 'revision_requested' ? await api.patch(path) : await api.post(path)
  if (useAuthStore.getState().user?.id === user.id && useAuthStore.getState().user?.propertyId === id) {
    useOnboardingStore.getState().completeStep(7)
    selectApplicationStatus(id, response.data.status)
  }
}
