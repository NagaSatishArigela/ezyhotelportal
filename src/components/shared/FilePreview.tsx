import { resolvePreviewUrl } from '@/lib/private-document'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function FilePreview({ src, name, isPdf = false }: { src: string; name: string; isPdf?: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  return <>
    <button type="button" className="text-xs font-semibold text-primary-700 underline" onClick={async () => { setFailed(false); setPreviewUrl(undefined); setLoading(true); setOpen(true); try { setPreviewUrl(await resolvePreviewUrl(src)) } catch { setFailed(true) } finally { setLoading(false) } }} aria-label={`Preview ${name}`}>Preview</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>Preview of your uploaded file.</DialogDescription>
        {loading ? <p role="status">Loading preview...</p> : failed ? <p role="alert">Preview unavailable. Please try again.</p> : isPdf ? <object data={previewUrl} type="application/pdf" className="w-full h-[65vh] mt-4"><p>PDF preview is unavailable in this browser.</p></object>
          : <img src={previewUrl} alt={name} className="mt-4 max-h-[65vh] w-full object-contain" onError={() => setFailed(true)} />}
      </DialogContent>
    </Dialog>
  </>
}
