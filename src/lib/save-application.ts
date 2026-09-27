import { api } from './api'
import { ensureApplicationDraft } from './onboarding-session'
import { completeServerSteps, isServerStepComplete, mapServerStep, PORTAL_TO_SERVER_STEPS } from './onboarding-mapping'
import { saveOnboardingStep } from './portal-api'
import { useOnboardingStore } from '@/store/onboarding.store'
import { useAuthStore } from '@/store/auth.store'

// Serialize across screen mounts: an older request must finish before a newer save starts.
let tail: Promise<void> = Promise.resolve()
const signatures = new Map<string, string>()
export function saveApplicationProgress(portalStep?: number): Promise<void> {
  const initial = useOnboardingStore.getState()
  const owner = useAuthStore.getState().user?.id
  const data = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(initial.stepData).filter(([step]) => Number(step) <= 6))))
  const savedCompliance = initial.useSavedCompliance
  const current = () => {
    if (!owner || useAuthStore.getState().user?.id !== owner || useOnboardingStore.getState().selectionVersion !== initial.selectionVersion) throw new Error('Application changed while saving')
  }
  const run = tail.catch(() => {}).then(async () => {
    current()
    const draftId = await ensureApplicationDraft()
    current()
    await api.patch('/properties/' + draftId + '/application-state', data)
    const serverSteps = portalStep === undefined
      ? completeServerSteps(data).map(({ step }) => step)
      : PORTAL_TO_SERVER_STEPS[portalStep] ?? []
    for (const step of serverSteps) {
      current()
      if (step === 5 && savedCompliance) continue
      const payload = mapServerStep(step, data)
      // The encrypted snapshot accepts incomplete typing. Canonical endpoints
      // validate full server-step DTOs, so call them only after every field
      // feeding that server step has been collected.
      if (!isServerStepComplete(step, payload)) continue
      const key = `${owner}:${initial.selectionVersion}:${draftId}:${step}`
      const signature = JSON.stringify(payload)
      if (signatures.get(key) === signature) continue
      await saveOnboardingStep(draftId, step, payload)
      signatures.set(key, signature)
    }
  })
  tail = run
  return run
}
