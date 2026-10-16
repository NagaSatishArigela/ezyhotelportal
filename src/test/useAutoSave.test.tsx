import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAutoSave, useAutoSaveSnapshot } from '@/hooks/useAutoSave'
import { useOnboardingStore } from '@/store/onboarding.store'

it('flushes the latest upload changes when navigating away before the server debounce', async () => {
  const saveFn = vi.fn().mockResolvedValue(undefined)
  const { result, unmount } = renderHook(() => useAutoSave({ step: 5, saveFn }))
  act(() => result.current.triggerSave({ docUrls: { pan: 'https://files.example/pan.pdf' } }))
  expect(useOnboardingStore.getState().stepData[5]).toEqual({ docUrls: { pan: 'https://files.example/pan.pdf' } })
  act(() => result.current.triggerSave({ docUrls: {}, documents: [] }))
  unmount()
  expect(useOnboardingStore.getState().stepData[5]).toEqual({ docUrls: {}, documents: [] })
  await waitFor(() => expect(saveFn).toHaveBeenCalledWith({ docUrls: {}, documents: [] }))
})
it('waits for in-flight saves and writes the latest edit afterwards', async () => {
  let finish!: () => void
  const saveFn = vi.fn().mockImplementationOnce(() => new Promise<void>(r => { finish = r })).mockResolvedValue(undefined)
  const { result } = renderHook(() => useAutoSave({ step: 2, saveFn }))
  act(() => result.current.triggerSave({ propertyName: 'Old' }))
  let pending!: Promise<void>
  act(() => { pending = result.current.saveNow() })
  await waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1))
  act(() => result.current.triggerSave({ propertyName: 'Latest' }))
  await act(async () => { finish(); await pending })
  expect(saveFn.mock.calls.map(c => c[0])).toEqual([{ propertyName: 'Old' }, { propertyName: 'Latest' }])
  expect(useOnboardingStore.getState().autoSaveState).toBe('saved')
})


it('does not restart autosave for equivalent form snapshots on rerender', () => {
  const trigger = vi.fn()
  const { rerender } = renderHook(({ data }) => useAutoSaveSnapshot(data, trigger), { initialProps: { data: { name: 'Property' } } })
  expect(trigger).toHaveBeenCalledTimes(1)
  rerender({ data: { name: 'Property' } })
  expect(trigger).toHaveBeenCalledTimes(1)
  rerender({ data: { name: 'Updated property' } })
  expect(trigger).toHaveBeenCalledTimes(2)
  expect(trigger).toHaveBeenLastCalledWith({ name: 'Updated property' })
})

it('keeps the save trigger stable when an inline error callback changes', () => {
  const saveFn = vi.fn().mockResolvedValue(undefined)
  const { result, rerender } = renderHook(() => useAutoSave({ step: 2, saveFn, onError: () => undefined }))
  const trigger = result.current.triggerSave
  rerender()
  expect(result.current.triggerSave).toBe(trigger)
})
