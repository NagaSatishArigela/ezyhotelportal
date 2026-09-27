import { useCallback, useEffect, useRef } from 'react'
import { useOnboardingStore } from '@/store/onboarding.store'

interface UseAutoSaveOptions {
  step: number
  saveFn: (data: Record<string, unknown>) => Promise<void>
  onError?: (error: unknown) => void
  debounceMs?: number
}
export function useAutoSave({ step, saveFn, onError, debounceMs = 1500 }: UseAutoSaveOptions) {
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const mounted = useRef(true)
  const latest = useRef<Record<string, unknown>>()
  const revision = useRef(0)
  const dirty = useRef(false)
  const running = useRef<Promise<void>>()
  const saver = useRef(saveFn)
  saver.current = saveFn

  const saveNow = useCallback(async function flush(): Promise<void> {
    clearTimeout(timer.current)
    timer.current = undefined
    if (running.current) { await running.current; if (dirty.current) return flush(); return }
    if (!dirty.current || !latest.current) return
    const version = revision.current
    const data = latest.current
    if (mounted.current) useOnboardingStore.getState().setAutoSaveState('saving')
    const task = Promise.resolve().then(() => saver.current(data)).then(() => {
      if (version === revision.current) {
        dirty.current = false
        if (mounted.current) {
          useOnboardingStore.getState().setAutoSaveState('saved')
          useOnboardingStore.getState().setLastSavedAt(new Date().toISOString())
        }
      }
    }).catch(error => {
      if (mounted.current) useOnboardingStore.getState().setAutoSaveState('error')
      throw error
    }).finally(() => { running.current = undefined })
    running.current = task
    await task
    if (dirty.current) await flush()
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
      // Navigation must not silently discard the pending server save.
      void saveNow().catch(() => {})
    }
  }, [saveNow])

  const triggerSave = useCallback((data: Record<string, unknown>) => {
    latest.current = data
    revision.current++
    dirty.current = true
    useOnboardingStore.getState().saveStepData(step, data)
    useOnboardingStore.getState().setAutoSaveState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { void saveNow().catch(error => onError?.(error)) }, debounceMs)
  }, [step, debounceMs, saveNow, onError])

  return { triggerSave, saveNow }
}
