import { privateDocumentPath } from '@/lib/private-document'
import { useEffect, useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { FilePreview } from './FilePreview'
import { uploadErrorMessage } from '@/lib/upload-error'
import { DOCUMENT_ACCEPT, uploadFilename, validateUpload } from '@/lib/upload-validation'

interface DocumentUploaderProps {
  label: string
  hint?: string
  why?: string
  required?: boolean
  accept?: string
  maxSizeMB?: number
  onUpload: (file: File) => Promise<void>
  onRemove?: () => void
  onBusyChange?: (busy: boolean) => void
  value?: string
}

export function DocumentUploader({ label, hint, why, required = true, accept = DOCUMENT_ACCEPT, maxSizeMB = 10, onUpload, onRemove, onBusyChange, value }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [local, setLocal] = useState<{ src: string; name: string; isPdf: boolean } | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => () => { if (local) URL.revokeObjectURL(local.src) }, [local])
  useEffect(() => { if (!value && !busyRef.current) setLocal(null) }, [value])

  const handleFile = async (file: File) => {
    if (busyRef.current) return
    const issue = validateUpload(file, accept, maxSizeMB)
    if (issue) { setError(issue); return }
    busyRef.current = true
    setBusy(true)
    onBusyChange?.(true)
    setError('')
    try {
      await onUpload(file)
      if (mounted.current) setLocal({ src: URL.createObjectURL(file), name: file.name, isPdf: file.name.toLowerCase().endsWith('.pdf') })
    } catch (error) {
      if (mounted.current) setError(`${uploadErrorMessage(error)}${value ? ' Your previous file has been kept.' : ''}`)
    } finally {
      busyRef.current = false
      onBusyChange?.(false)
      if (mounted.current) setBusy(false)
    }
  }
  const src = local?.src || value
  const name = local?.name || (value ? uploadFilename(value) : '')
  const isPdf = local?.isPdf ?? /\.pdf(?:[?#]|$)/i.test(value || '')
  return <div className="space-y-1.5">
    <p className="text-[12.5px] font-semibold text-navy-900">{label}{required && <span className="text-error-500 ml-0.5">*</span>}</p>
    {hint && <p className="text-xs text-navy-400">{hint}</p>}
    {why && <p className="text-xs text-primary-600" title={why}>Why we need this</p>}
    <button type="button" disabled={busy} aria-label={`${src ? 'Replace' : 'Upload'} ${label}`}
      className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-6 hover:border-primary-400 disabled:opacity-60"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void handleFile(file) }}>
      {src && !isPdf && !privateDocumentPath(src) ? <img src={src} alt={name} className="h-24 w-full object-contain" /> : src ? <FileText size={24} /> : <Upload size={24} />}
      <span className="max-w-full truncate text-sm">{busy ? 'Uploading...' : name || 'Click or drag to upload'}</span>
      <span className="text-xs text-navy-400">{src ? 'Click to replace file' : `${accept} - Max ${maxSizeMB}MB`}</span>
    </button>
    {src && <div className="flex items-center justify-between">
      <FilePreview src={src} name={name} isPdf={isPdf} />
      {onRemove && <button type="button" disabled={busy} aria-label={`Remove ${label}`} className="text-xs text-error-500" onClick={() => { onRemove(); setLocal(null); setError('') }}>Remove</button>}
    </div>}
    {error && <p role="alert" className="text-xs text-error-500">{error}</p>}
    <input ref={inputRef} type="file" accept={accept} disabled={busy} className="sr-only" aria-label={label}
      onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleFile(file) }} />
  </div>
}
