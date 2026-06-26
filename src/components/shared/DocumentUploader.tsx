import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface DocumentUploaderProps {
  label: string
  hint?: string
  why?: string
  required?: boolean
  accept?: string
  maxSizeMB?: number
  onUpload: (file: File) => Promise<void>
  value?: string
}

export function DocumentUploader({
  label,
  hint,
  why,
  required = true,
  accept = '.jpg,.jpeg,.png,.pdf',
  maxSizeMB = 10,
  onUpload,
  value,
}: DocumentUploaderProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef  = useRef(true)

  const [state,    setState]    = useState<UploadState>(value ? 'success' : 'idle')
  const [progress, setProgress] = useState(0)
  const [filename, setFilename] = useState(value ?? '')
  const [error,    setError]    = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`)
      setState('error')
      return
    }
    setError('')
    setFilename(file.name)
    setState('uploading')
    setProgress(0)

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) setProgress((p) => Math.min(p + 20, 90))
    }, 200)

    try {
      await onUpload(file)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (mountedRef.current) {
        setProgress(100)
        setState('success')
      }
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (mountedRef.current) {
        setError('Upload failed. Please try again.')
        setState('error')
      }
    }
  }, [maxSizeMB, onUpload])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12.5px] font-semibold text-navy-900">
          {label}
          {required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
        {why && (
          <span className="text-xs text-primary-600 cursor-help underline decoration-dashed" title={why}>
            Why we need this
          </span>
        )}
      </div>

      {hint && <p className="text-xs text-navy-400">{hint}</p>}

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-(--radius-md) border-2 border-dashed p-6 transition-all cursor-pointer',
          dragging && 'border-primary-600 bg-primary-50',
          state === 'idle'      && !dragging && 'border-navy-200 hover:border-primary-400 hover:bg-navy-50',
          state === 'uploading' && 'border-primary-300 bg-primary-50 pointer-events-none',
          state === 'success'   && 'border-success-500 bg-success-50',
          state === 'error'     && 'border-error-500 bg-error-50',
        )}
      >
        {state === 'idle' && (
          <>
            <Upload className="text-navy-400" size={24} aria-hidden />
            <div className="text-center">
              <p className="text-sm font-medium text-navy-700">Click or drag to upload</p>
              <p className="text-xs text-navy-400 mt-0.5">{accept.replace(/\./g, '').toUpperCase()} · Max {maxSizeMB}MB</p>
            </div>
          </>
        )}

        {state === 'uploading' && (
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary-600 shrink-0" aria-hidden />
              <p className="text-sm text-navy-700 truncate flex-1">{filename}</p>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-navy-400 text-center">Uploading… {progress}%</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex items-center gap-2 w-full">
            <CheckCircle size={18} className="text-success-500 shrink-0" aria-hidden />
            <p className="text-sm font-medium text-success-700 truncate flex-1">{filename}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setState('idle'); setFilename('') }}
              className="text-navy-400 hover:text-navy-600 ml-auto shrink-0"
              aria-label="Remove file"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-center gap-2 w-full">
            <AlertCircle size={18} className="text-error-500 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium text-error-700">{error || 'Upload failed'}</p>
              <p className="text-xs text-error-500 mt-0.5">Click to try again</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        aria-label={label}
      />
    </div>
  )
}
