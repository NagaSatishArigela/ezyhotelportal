import { resolvePreviewUrl } from '@/lib/private-document'
import { privateDocumentPath, photoPreviewPath } from '@/lib/private-document'
import { protectedDocumentPath } from '@/lib/document-preview'
import { api } from '@/lib/api'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function FilePreview({ src, name, isPdf = false }: { src: string; name: string; isPdf?: boolean }) {
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ source: string; url?: string; failed?: boolean }>()
  const legacyPath = protectedDocumentPath(src)
  const remote = !!(legacyPath || privateDocumentPath(src) || photoPreviewPath(src))
  useEffect(() => {
    if (!open) return
    let active = true
    let objectUrl: string | undefined
    setResult(undefined)
    const preview = legacyPath
      ? api.get<Blob>(legacyPath, { responseType: 'blob' }).then(({ data }) => {
        if (!active) return ''
        objectUrl = URL.createObjectURL(data)
        return objectUrl
      })
      : resolvePreviewUrl(src)
    preview.then(url => {
      if (active) setResult({ source: src, url })
    }).catch(() => { if (active) setResult({ source: src, failed: true }) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, open, attempt, legacyPath])
  const current = result?.source === src ? result : remote ? undefined : { source: src, url: src }
  const loading = !current
  return <>
    <button type="button" className="text-xs font-semibold text-primary-700 underline" onClick={() => { setResult(undefined); setOpen(true) }} aria-label={`Preview ${name}`}>Preview</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>Preview of your uploaded file.</DialogDescription>
        {loading ? <p role="status">Loading preview...</p> : current.failed ? <div><p role="alert">Preview unavailable. Your upload has been kept.</p><button type="button" className="mt-3 text-primary-700 underline" onClick={() => setAttempt(a => a + 1)}>Retry preview</button></div> : isPdf ? <object data={current.url} type="application/pdf" className="w-full h-[65vh] mt-4"><p>PDF preview is unavailable in this browser.</p></object>
          : <img src={current.url} alt={name} className="mt-4 max-h-[65vh] w-full object-contain" onError={() => setResult({ source: src, failed: true })} />}
        {legacyPath && current?.url && !current.failed && <a href={current.url} download={name}>Download document</a>}
      </DialogContent>
    </Dialog>
  </>
}
