/** Resolve local verification documents through our authenticated API, never a foreign origin. */
export function protectedDocumentPath(src: string): string | undefined {
  try {
    const path = new URL(src, 'http://preview.invalid').pathname;
    const match = path.match(/\/uploads\/[a-f0-9-]{36}\/document\/[a-f0-9-]{36}\.(?:jpg|png|webp|pdf)$/i)
    return match?.[0]
  } catch { return undefined }
}
