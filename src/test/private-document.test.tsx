import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilePreview } from '@/components/shared/FilePreview'
import { api } from '@/lib/api'
import { resolvePreviewUrl } from '@/lib/private-document'
import { UploadedPhoto } from '@/components/shared/UploadedPhoto'
const path = '/uploads/documents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf'
const photo = 'https://storage.example.test/bucket/properties/11111111-1111-4111-8111-111111111111/photo/22222222-2222-4222-8222-222222222222.jpg'
it('resolves persisted photo URLs and obtains a fresh URL when preview fails', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { url: 'https://storage.example.test/first.jpg' } }).mockResolvedValueOnce({ data: { url: 'https://storage.example.test/retry.jpg' } })
  render(<FilePreview src={photo} name="Exterior" />)
  await userEvent.click(screen.getByRole('button', { name: 'Preview Exterior' }))
  const img = await screen.findByRole('img')
  expect(get).toHaveBeenCalledWith('/uploads/photos/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg')
  fireEvent.error(img)
  await userEvent.click(screen.getByRole('button', { name: 'Retry preview' }))
  await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'https://storage.example.test/retry.jpg'))
})
it('loads saved thumbnails after remount without a browser blob', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { url: 'https://storage.example.test/signed.jpg' } })
  const first = render(<UploadedPhoto src={photo} alt="Room" />)
  expect(await screen.findByRole('img')).toHaveAttribute('src', 'https://storage.example.test/signed.jpg')
  first.unmount()
  render(<UploadedPhoto src={photo} alt="Room" />)
  await screen.findByRole('img')
  expect(get).toHaveBeenCalledTimes(2)
})
afterEach(() => vi.restoreAllMocks())
it('resolves private references through the authenticated API only when opened', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { url: 'https://private.example.test/signed.pdf' } })
  render(<FilePreview src={'https://api.example.test' + path} name="PAN document" isPdf />)
  expect(get).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Preview PAN document' }))
  await screen.findByRole('dialog')
  expect(get).toHaveBeenCalledWith(path)
  expect(document.querySelector('object')?.getAttribute('data')).toBe('https://private.example.test/signed.pdf')
})
it('does not show a document when authorization fails', async () => {
  vi.spyOn(api, 'get').mockRejectedValue(new Error('Forbidden'))
  render(<FilePreview src={'https://api.example.test' + path} name="Private" isPdf />)
  await userEvent.click(screen.getByRole('button', { name: 'Preview Private' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Preview unavailable')
  expect(document.querySelector('object')).toBeNull()
})
it('keeps existing photo and local blob previews compatible', async () => {
  const get = vi.spyOn(api, 'get')
  await expect(resolvePreviewUrl('blob:test-photo')).resolves.toBe('blob:test-photo')
  expect(get).not.toHaveBeenCalled()
})
