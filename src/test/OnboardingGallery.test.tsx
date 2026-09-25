import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Step3Policies, Step6BankAccount } from '@/pages/owner/onboarding/OnboardingScreens'
import { useOnboardingStore } from '@/store/onboarding.store'
import { uploadFile, verifyIFSC } from '@/lib/portal-api'

vi.mock('@/lib/portal-api', () => ({
  uploadFile: vi.fn(), saveOnboardingStep: vi.fn(), createPropertyDraft: vi.fn(),
  submitOnboarding: vi.fn(), verifyIFSC: vi.fn(), pennyDrop: vi.fn(), verifyPincode: vi.fn(),
}))

afterEach(() => vi.restoreAllMocks())

it('normalizes the bank form IFSC and retains manual bank details during lookup outages', async () => {
  vi.mocked(verifyIFSC).mockRejectedValue(new Error('IFSC lookup is unavailable. Enter the bank name manually.'))
  render(<Step6BankAccount />)
  const code = screen.getByPlaceholderText('HDFC0001234')
  const bank = screen.getByPlaceholderText('Auto-filled from IFSC')
  fireEvent.change(code, { target: { value: ' sbin0000001 ' } })
  fireEvent.change(bank, { target: { value: 'State Bank of India' } })
  fireEvent.blur(code)
  await screen.findByRole('alert')
  expect(verifyIFSC).toHaveBeenCalledWith('SBIN0000001')
  expect(bank).toHaveValue('State Bank of India')
  expect(useOnboardingStore.getState().stepData[6]?.ifscCode).toBe('SBIN0000001')
})

beforeEach(() => {
  vi.mocked(uploadFile).mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:replacement')
  URL.revokeObjectURL = vi.fn()
  useOnboardingStore.getState().reset()
  useOnboardingStore.getState().setDraftId('draft')
  useOnboardingStore.getState().saveStepData(3, { photos: [{ id: 'photo', category: 'exterior', url: 'https://files.example/old.png', isPrimary: true, sortOrder: 0 }] })
})

it('keeps the gallery mounted and records uploads when browser storage is full', async () => {
  render(<Step3Policies />)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
  vi.mocked(uploadFile).mockResolvedValue({ url: 'https://files.example/new.png', key: 'new' })
  fireEvent.change(screen.getAllByLabelText(/^Add .* photos$/)[0], {
    target: { files: [new File(['image'], 'new.png', { type: 'image/png' })] },
  })
  await waitFor(() => expect(useOnboardingStore.getState().stepData[3]?.photos).toHaveLength(2))
  expect(screen.getByText('Media & gallery')).toBeVisible()
  expect(screen.getAllByRole('img')).toHaveLength(2)
})

it('continues a batch after one upload fails and retains successful photos', async () => {
  vi.mocked(uploadFile).mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ url: 'https://files.example/new.png', key: 'new' })
  render(<Step3Policies />)
  fireEvent.change(screen.getAllByLabelText(/^Add .* photos$/)[0], {
    target: { files: ['failed.png', 'new.png'].map(name => new File(['image'], name, { type: 'image/png' })) },
  })
  await waitFor(() => expect(useOnboardingStore.getState().stepData[3]?.photos).toHaveLength(2))
  expect(uploadFile).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Media & gallery')).toBeVisible()
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
