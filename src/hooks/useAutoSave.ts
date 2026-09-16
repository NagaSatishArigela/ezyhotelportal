import { useCallback, useEffect, useRef } from 'react'
import { useOnboardingStore } from '@/store/onboarding.store'
import { sleep } from '@/lib/utils'

interface UseAutoSaveOptions {
  step: number
  saveFn: (data: Record<string, unknown>) => Promise<void>
  debounceMs?: number
}

export function useAutoSave({ step, saveFn, debounceMs = 1500 }: UseAutoSaveOptions) {
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(true)
  const lastDataRef  = useRef<Record<string, unknown> | null>(null)

  const setAutoSaveState = useOnboardingStore((s) => s.setAutoSaveState)
  const setLastSavedAt   = useOnboardingStore((s) => s.setLastSavedAt)
  const saveStepData     = useOnboardingStore((s) => s.saveStepData)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current)     clearTimeout(timerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const triggerSave = useCallback(
    (data: Record<string, unknown>) => {
      lastDataRef.current = data
      // Keep the local draft current even if Back or reload cancels the debounce.
      saveStepData(step, data)
      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return
        setAutoSaveState('saving')
        saveStepData(step, data)
        try {
          // Run save and minimum display time in parallel
          await Promise.all([saveFn(data), sleep(300)])
          if (!mountedRef.current) return
          setAutoSaveState('saved')
          setLastSavedAt(new Date().toISOString())
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
          idleTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setAutoSaveState('idle')
          }, 3000)
        } catch {
          if (mountedRef.current) setAutoSaveState('error')
        }
      }, debounceMs)
    },
    [step, saveFn, debounceMs, setAutoSaveState, setLastSavedAt, saveStepData]
  )

  // Flush any pending debounced save immediately. Called by WizardShell before
  // navigating away so data isn't lost if the user clicks Continue within 1.5s.
  // No-op if the debounce already fired (timerRef is null).
  const saveNow = useCallback(async () => {
    if (!timerRef.current || !lastDataRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
    setAutoSaveState('saving')
    saveStepData(step, lastDataRef.current)
    try {
      await Promise.all([saveFn(lastDataRef.current), sleep(300)])
      if (!mountedRef.current) return
      setAutoSaveState('saved')
      setLastSavedAt(new Date().toISOString())
    } catch (err) {
      if (mountedRef.current) setAutoSaveState('error')
      throw err
    }
  }, [step, saveFn, setAutoSaveState, setLastSavedAt, saveStepData])

  return { triggerSave, saveNow }
}
