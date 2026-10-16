import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { FilePreview } from '@/components/shared/FilePreview'
import { api } from '@/lib/api'

const path = '/uploads/a1234567-1234-4123-8123-123456789012/document/b1234567-1234-4123-8123-123456789012.pdf'
beforeEach(() => {
  vi.restoreAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:authorized-preview')
  URL.revokeObjectURL = vi.fn()
})

it('loads protected documents through the authenticated API and cleans up the blob preview', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: new Blob(['%PDF-1.7'], { type: 'application/pdf' }) })
  const { unmount } = render(<FilePreview src={`https://api.example${path}`} name="PAN card" isPdf />)
  expect(get).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Preview PAN card' }))
  await waitFor(() => expect(screen.getByRole('dialog').querySelector('object')).toHaveAttribute('data', 'blob:authorized-preview'))
  expect(get).toHaveBeenCalledWith(path, expect.objectContaining({ responseType: 'blob' }))
  expect(screen.getByRole('link', { name: 'Download document' })).toHaveAttribute('href', 'blob:authorized-preview')
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized-preview')
})

it('surfaces denied document access and allows retrying', async () => {
  const get = vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('Forbidden')).mockResolvedValueOnce({ data: new Blob(['%PDF-1.7']) })
  render(<FilePreview src={`https://api.example${path}`} name="ID proof" isPdf />)
  fireEvent.click(screen.getByRole('button', { name: 'Preview ID proof' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }))
  await screen.findByRole('link', { name: 'Download document' })
  expect(get).toHaveBeenCalledTimes(2)
})

it('keeps public photos and local upload previews working without an authenticated fetch', () => {
  const get = vi.spyOn(api, 'get')
  render(<FilePreview src="blob:local-photo" name="New photo" />)
  fireEvent.click(screen.getByRole('button', { name: 'Preview New photo' }))
  expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:local-photo')
  expect(get).not.toHaveBeenCalled()
})
