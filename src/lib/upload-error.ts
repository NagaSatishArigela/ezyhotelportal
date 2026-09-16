import { isAxiosError } from 'axios'

export class UploadError extends Error {}

export function presignError(error: unknown): UploadError {
  if (!isAxiosError(error)) return new UploadError('Could not prepare the upload. Please try again.')
  const status = error.response?.status
  const body = error.response?.data
  // Nest errors are wrapped by the server's HttpExceptionFilter.
  const message = body?.error?.message ?? body?.message
  const detail = typeof message === 'string' ? message
    : Array.isArray(message) ? message.filter((item): item is string => typeof item === 'string').join('; ') : ''
  if (!status) return new UploadError('Could not reach the upload service. Check your connection and try again.')
  return new UploadError(`Could not prepare upload (HTTP ${status}). ${detail || 'Please try again.'}`)
}

export function uploadErrorMessage(error: unknown): string {
  return error instanceof UploadError ? error.message : 'Upload failed. Please try again.'
}
