import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function FilePreview({ src, name, isPdf = false }: { src: string; name: string; isPdf?: boolean }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  return <>
    <button type="button" className="text-xs font-semibold text-primary-700 underline" onClick={() => { setFailed(false); setOpen(true) }} aria-label={`Preview ${name}`}>Preview</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>Preview of your uploaded file.</DialogDescription>
        {isPdf ? <object data={src} type="application/pdf" className="w-full h-[65vh] mt-4"><p>PDF preview is unavailable in this browser.</p></object>
          : failed ? <p role="status">Preview could not be loaded. Try replacing the file.</p>
            : <img src={src} alt={name} className="mt-4 max-h-[65vh] w-full object-contain" onError={() => setFailed(true)} />}
      </DialogContent>
    </Dialog>
  </>
}
