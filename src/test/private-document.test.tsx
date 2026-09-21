import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilePreview } from '@/components/shared/FilePreview'
import { api } from '@/lib/api'
import { resolvePreviewUrl } from '@/lib/private-document'
const path = '/uploads/documents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf'
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
