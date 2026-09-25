import { resolvePreviewUrl } from '@/lib/private-document'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function FilePreview({ src, name, isPdf = false }: { src: string; name: string; isPdf?: boolean }) {
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ source: string; url?: string; failed?: boolean }>()
  useEffect(() => {
    if (!open) return
    let active = true
    setResult(undefined)
    resolvePreviewUrl(src).then(url => {
      if (active) setResult({ source: src, url })
    }).catch(() => { if (active) setResult({ source: src, failed: true }) })
    return () => { active = false }
  }, [src, open, attempt])
  const loading = !result || result.source !== src
  return <>
    <button type="button" className="text-xs font-semibold text-primary-700 underline" onClick={() => { setResult(undefined); setOpen(true) }} aria-label={`Preview ${name}`}>Preview</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>Preview of your uploaded file.</DialogDescription>
        {loading ? <p role="status">Loading preview...</p> : result.failed ? <div><p role="alert">Preview unavailable. Your upload has been kept.</p><button type="button" className="mt-3 text-primary-700 underline" onClick={() => setAttempt(a => a + 1)}>Retry preview</button></div> : isPdf ? <object data={result.url} type="application/pdf" className="w-full h-[65vh] mt-4"><p>PDF preview is unavailable in this browser.</p></object>
          : <img src={result.url} alt={name} className="mt-4 max-h-[65vh] w-full object-contain" onError={() => setResult({ source: src, failed: true })} />}
      </DialogContent>
    </Dialog>
  </>
}
