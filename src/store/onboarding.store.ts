import type { DraftCompliance } from '@/lib/portal-api'
import { completedOnboardingSteps } from '@/lib/onboarding-validation'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AutoSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface OnboardingState {
  selectionVersion: number
  restoredDraftId: string | null
  savedCompliance: DraftCompliance | null
  useSavedCompliance: boolean
  editCompliance: () => void
  ownerId: string | null
  bindOwner: (ownerId: string, propertyId?: string) => void
  currentStep: number
  completedSteps: number[]
  draftId: string | null
  autoSaveState: AutoSaveState
  lastSavedAt: string | null

  // Step data snapshots keyed by step number — persisted so the wizard can
  // resume on page reload. Values are serialisable plain objects matching the
  // Zod schema for each step; unknown is intentional here because each step's
  // shape is validated by its own Zod resolver before submission.
  stepData: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, Record<string, unknown>>>

  // Registered by the active step via useOnboardingAutoSave — not persisted.
  // WizardShell calls this before navigating to guarantee any pending debounce
  // is flushed to the backend before the component unmounts.
  onBeforeNext: (() => Promise<void>) | null

  setCurrentStep: (step: number) => void
  completeStep: (step: number) => void
  setDraftId: (id: string) => void
  setAutoSaveState: (state: AutoSaveState) => void
  setLastSavedAt: (ts: string) => void
  saveStepData: (step: number, data: Record<string, unknown>) => void
  setOnBeforeNext: (fn: (() => Promise<void>) | null) => void
  reset: () => void
}

const initialState = {
  selectionVersion: 0,
  restoredDraftId: null,
  savedCompliance: null as DraftCompliance | null,
  useSavedCompliance: false,
  ownerId: null,
  currentStep: 1,
  completedSteps: [],
  draftId: null,
  autoSaveState: 'idle' as AutoSaveState,
  lastSavedAt: null,
  stepData: {},
}

function safePersistedOnboarding(value: string): string {
  const parsed = JSON.parse(value)
  const state = parsed.state ?? {}
  // Resume non-sensitive property details only; legal, payout and identity inputs stay in memory.
  const steps = state.stepData ?? {}
  parsed.state = {
    ownerId: state.ownerId, draftId: state.draftId,
    currentStep: state.currentStep, completedSteps: state.completedSteps,
    stepData: Object.fromEntries([2, 3, 4].filter(k => steps[k]).map(k => [k, steps[k]])),
  }
  return JSON.stringify(parsed)
}
const safeOnboardingStorage = {
  getItem(name: string) {
    const raw = localStorage.getItem(name)
    if (!raw) return null
    try { const safe = safePersistedOnboarding(raw); localStorage.setItem(name, safe); return safe }
    catch { localStorage.removeItem(name); return null }
  },
  setItem(name: string, value: string) {
    // Keep the live draft and server autosave working when browser storage is full.
    try { localStorage.setItem(name, safePersistedOnboarding(value)) }
    catch { /* Browser persistence is best-effort. */ }
  },
  removeItem(name: string) { localStorage.removeItem(name) },
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      onBeforeNext: null,
      editCompliance: () => set(state => ({ useSavedCompliance: false, completedSteps: completedOnboardingSteps(state.stepData) })),
      bindOwner: (ownerId, propertyId) => set((state) => {
        const sameOwner = state.ownerId === ownerId
        const matchingProperty = !!propertyId && state.draftId === propertyId
        // Legacy drafts can only be retained when the server confirms their property.
        if ((sameOwner || state.ownerId === null) && matchingProperty) return { ownerId }
        if (sameOwner && !propertyId && !state.draftId) return { ownerId }
        return { ...initialState, selectionVersion: state.selectionVersion + 1, ownerId, draftId: propertyId ?? null, onBeforeNext: null }
      }),

      setCurrentStep: (step) => set({ currentStep: step }),
      completeStep: (step) =>
        set((s) => ({
          completedSteps: s.completedSteps.includes(step)
            ? s.completedSteps
            : [...s.completedSteps, step],
        })),
      setDraftId: (id) => set({ draftId: id }),
      setAutoSaveState: (autoSaveState) => set({ autoSaveState }),
      setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
      saveStepData: (step, data) =>
        set((s) => {
          const stepData = { ...s.stepData, [step]: data }
          return { stepData, completedSteps: completedOnboardingSteps(stepData, s.useSavedCompliance && !!s.savedCompliance, s.completedSteps.includes(7)) }
        }),
      setOnBeforeNext: (fn) => set({ onBeforeNext: fn }),
      reset: () => set(state => ({ ...initialState, selectionVersion: state.selectionVersion + 1, onBeforeNext: null })),
    }),
    {
      name: 'stayflex-onboarding',
      storage: createJSONStorage(() => safeOnboardingStorage),
      // onBeforeNext is a function — not serialisable, must not be persisted
      partialize: (state) => ({
        ownerId: state.ownerId,
        savedCompliance: state.savedCompliance,
        useSavedCompliance: state.useSavedCompliance,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        draftId: state.draftId,
        autoSaveState: state.autoSaveState,
        lastSavedAt: state.lastSavedAt,
        stepData: state.stepData,
      }),
    }
  )
)
