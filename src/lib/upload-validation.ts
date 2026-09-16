export const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp'
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png'

export function validateUpload(file: File, accept: string, maxSizeMB = 10): string | null {
  if (!file.size) return 'The file is empty. Choose another file.'
  if (file.size > maxSizeMB * 1024 * 1024) return `File too large. Max ${maxSizeMB}MB.`
  const matches = accept.split(',').some((entry) => {
    const part = entry.trim().toLowerCase()
    return part.startsWith('.') ? file.name.toLowerCase().endsWith(part)
      : part.endsWith('/*') ? file.type.startsWith(part.slice(0, -1)) : file.type === part
  })
  return matches ? null : `Choose a supported file (${accept}).`
}

export function uploadFilename(url: string): string {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Uploaded file') }
  catch { return 'Uploaded file' }
}
