import { api } from './api'
export function privateDocumentPath(src: string): string | null {
  try {
    const path = new URL(src).pathname
    return /^\/uploads\/documents\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(path) ? path : null
  } catch { return null }
}
export async function resolvePreviewUrl(src: string): Promise<string> {
  const path = privateDocumentPath(src) ?? photoPreviewPath(src)
  if (!path) return src
  const { data } = await api.get<{ url: string }>(path)
  return data.url
}

export function photoPreviewPath(src: string): string | null {
  try {
    const url = new URL(src)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const match = url.pathname.match(/\/properties\/([0-9a-f-]{36})\/photo\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/)
    return match ? `/uploads/photos/${match[1]}/${match[2]}` : null
  } catch { return null }
}
