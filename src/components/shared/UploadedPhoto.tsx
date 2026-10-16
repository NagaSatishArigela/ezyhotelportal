import { useEffect, useState } from 'react'
import { resolvePreviewUrl } from '@/lib/private-document'

/** Resolve saved storage references afresh on mount and on explicit retry. */
export function UploadedPhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ source: string; url?: string; failed?: boolean }>()
  useEffect(() => {
    let active = true
    setResult(undefined)
    resolvePreviewUrl(src).then(url => {
      if (active) setResult({ source: src, url })
    }).catch(() => { if (active) setResult({ source: src, failed: true }) })
    return () => { active = false }
  }, [src, attempt])
  if (!result || result.source !== src) return <span role="status" className="block p-4 text-xs text-navy-500">Loading photo…</span>
  if (result.failed) return <span className="block p-4 text-xs text-navy-500">Photo unavailable. <button type="button" className="underline text-primary-700" onClick={() => setAttempt(a => a + 1)}>Retry photo</button></span>
  return <img src={result.url} alt={alt} className={className} onError={() => setResult({ source: src, failed: true })} />
}
