import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useOnboardingStore } from '@/store/onboarding.store'

it('retains upload changes locally when navigating away before the server debounce', () => {
  const saveFn = vi.fn().mockResolvedValue(undefined)
  const { result, unmount } = renderHook(() => useAutoSave({ step: 5, saveFn }))
  act(() => result.current.triggerSave({ docUrls: { pan: 'https://files.example/pan.pdf' } }))
  expect(useOnboardingStore.getState().stepData[5]).toEqual({ docUrls: { pan: 'https://files.example/pan.pdf' } })
  act(() => result.current.triggerSave({ docUrls: {}, documents: [] }))
  unmount()
  expect(useOnboardingStore.getState().stepData[5]).toEqual({ docUrls: {}, documents: [] })
  expect(saveFn).not.toHaveBeenCalled()
})
