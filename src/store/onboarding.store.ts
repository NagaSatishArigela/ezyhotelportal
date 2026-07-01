import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AutoSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface OnboardingState {
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
  currentStep: 1,
  completedSteps: [],
  draftId: null,
  autoSaveState: 'idle' as AutoSaveState,
  lastSavedAt: null,
  stepData: {},
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      onBeforeNext: null,

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
        set((s) => ({ stepData: { ...s.stepData, [step]: data } })),
      setOnBeforeNext: (fn) => set({ onBeforeNext: fn }),
      reset: () => set(initialState),
    }),
    {
      name: 'stayflex-onboarding',
      storage: createJSONStorage(() => localStorage),
      // onBeforeNext is a function — not serialisable, must not be persisted
      partialize: (state) => ({
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
