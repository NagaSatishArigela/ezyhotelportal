import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { protectedDocumentPath } from '@/lib/document-preview'

export function FilePreview({ src, name, isPdf = false }: { src: string; name: string; isPdf?: boolean }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [documentPreview, setDocumentPreview] = useState<{ source: string; url: string } | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const documentPath = protectedDocumentPath(src)

  useEffect(() => {
    if (!open || !documentPath) return
    const controller = new AbortController()
    let active = true
    let objectUrl: string | undefined
    setDocumentPreview(null)
    setLoadError(false)
    api.get<Blob>(documentPath, { responseType: 'blob', signal: controller.signal }).then(({ data }) => {
      if (!active) return
      objectUrl = URL.createObjectURL(data)
      setDocumentPreview({ source: src, url: objectUrl })
    }).catch(() => { if (active) setLoadError(true) })
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, documentPath, src, attempt])

  const previewSrc = documentPath ? documentPreview?.source === src ? documentPreview.url : undefined : src
  return <>
    <button type="button" className="text-xs font-semibold text-primary-700 underline" onClick={() => { setFailed(false); setOpen(true) }} aria-label={`Preview ${name}`}>Preview</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>Preview of your uploaded file.</DialogDescription>
        {documentPath && loadError ? <div role="alert"><p>Could not load the document. Check your access and try again.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry preview</button></div>
          : !previewSrc ? <p role="status">Loading document…</p>
          : isPdf ? <object data={previewSrc} type="application/pdf" className="w-full h-[65vh] mt-4"><p>PDF preview is unavailable in this browser.</p></object>
          : failed ? <p role="status">Preview could not be loaded. Try replacing the file.</p>
            : <img src={previewSrc} alt={name} className="mt-4 max-h-[65vh] w-full object-contain" onError={() => setFailed(true)} />}
        {documentPath && previewSrc && !loadError && <a href={previewSrc} download={name} className="text-xs font-semibold text-primary-700 underline">Download document</a>}
      </DialogContent>
    </Dialog>
  </>
}
