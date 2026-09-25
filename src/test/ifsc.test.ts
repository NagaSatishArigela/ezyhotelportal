import { afterEach, expect, it, vi } from 'vitest'
import { verifyIFSC } from '@/lib/portal-api'

afterEach(() => vi.restoreAllMocks())

it('looks up non-demo IFSC codes and normalizes pasted input', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ BANK: 'Example Bank', BRANCH: 'Branch', CITY: 'City' })))
  await expect(verifyIFSC('  sbin0000001  ')).resolves.toEqual({ bank: 'Example Bank', branch: 'Branch', city: 'City' })
  expect(fetch).toHaveBeenCalledWith('https://ifsc.razorpay.com/SBIN0000001', expect.objectContaining({ credentials: 'omit' }))
})

it('rejects invalid format without a request', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  await expect(verifyIFSC('invalid')).rejects.toThrow('11-character')
  expect(fetch).not.toHaveBeenCalled()
})

it('distinguishes unknown branches from service failures', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 404 }))
  await expect(verifyIFSC('SBIN0000001')).rejects.toThrow('IFSC not found')
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  await expect(verifyIFSC('SBIN0000001')).rejects.toThrow('enter the bank name manually')
})
