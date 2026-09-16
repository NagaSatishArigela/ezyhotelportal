import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { Step3Policies } from '@/pages/owner/onboarding/OnboardingScreens'
import { useOnboardingStore } from '@/store/onboarding.store'
import { uploadFile } from '@/lib/portal-api'

vi.mock('@/lib/portal-api', () => ({
  uploadFile: vi.fn(), saveOnboardingStep: vi.fn(), createPropertyDraft: vi.fn(),
  submitOnboarding: vi.fn(), verifyIFSC: vi.fn(), pennyDrop: vi.fn(), verifyPincode: vi.fn(),
}))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:replacement')
  URL.revokeObjectURL = vi.fn()
  useOnboardingStore.getState().reset()
  useOnboardingStore.getState().setDraftId('draft')
  useOnboardingStore.getState().saveStepData(3, { photos: [{ id: 'photo', category: 'exterior', url: 'https://files.example/old.png', isPrimary: true, sortOrder: 0 }] })
})

it('replaces a gallery photo through the picker while retaining its cover and order', async () => {
  vi.mocked(uploadFile).mockResolvedValue({ url: 'https://files.example/new.png', key: 'new' })
  render(<Step3Policies />)
  const input = screen.getByLabelText('Replacement photo')
  const click = vi.spyOn(input, 'click')
  fireEvent.click(screen.getByRole('button', { name: /Replace .* photo/ }))
  expect(click).toHaveBeenCalledOnce()
  fireEvent.change(input, { target: { files: [new File(['image'], 'new.png', { type: 'image/png' })] } })
  await waitFor(() => expect(useOnboardingStore.getState().stepData[3]?.photos).toEqual([
    { id: 'photo', category: 'exterior', url: 'https://files.example/new.png', isPrimary: true, sortOrder: 0 },
  ]))
  expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:replacement')
})

it('keeps the saved gallery photo when replacement fails', async () => {
  vi.mocked(uploadFile).mockRejectedValue(new Error('Offline'))
  render(<Step3Policies />)
  fireEvent.click(screen.getByRole('button', { name: /Replace .* photo/ }))
  fireEvent.change(screen.getByLabelText('Replacement photo'), { target: { files: [new File(['image'], 'new.png', { type: 'image/png' })] } })
  await waitFor(() => expect(screen.getByLabelText('Replacement photo')).not.toBeDisabled())
  expect(screen.getByRole('img')).toHaveAttribute('src', 'https://files.example/old.png')
})
