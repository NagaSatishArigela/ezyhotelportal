import { api } from './api'
export function privateDocumentPath(src: string): string | null {
  try {
    const path = new URL(src).pathname
    return /^\/uploads\/documents\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(path) ? path : null
  } catch { return null }
}
export async function resolvePreviewUrl(src: string): Promise<string> {
  const path = privateDocumentPath(src)
  if (!path) return src
  const { data } = await api.get<{ url: string }>(path)
  return data.url
}
