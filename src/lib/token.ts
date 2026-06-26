export interface TokenPayload {
  sub: string
  role: string
  exp: number  // seconds since epoch (standard JWT)
  iat?: number
  [key: string]: unknown
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1])) as TokenPayload
    if (typeof payload.exp !== 'number') return null
    return payload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload) return true
  // JWT exp is in seconds; Date.now() is in milliseconds
  return Date.now() / 1000 > payload.exp
}
