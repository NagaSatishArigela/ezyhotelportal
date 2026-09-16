import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentUploader } from '@/components/shared/DocumentUploader'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

function Harness({ upload = async () => {} }: { upload?: (file: File) => Promise<void> }) {
  const [value, setValue] = useState<string | undefined>('https://files.example/original.pdf')
  return <form onSubmit={(event) => { event.preventDefault(); throw new Error('Unexpected submission') }}>
    <DocumentUploader label="PAN card" value={value} onRemove={() => setValue(undefined)} onUpload={async (file) => { await upload(file); setValue(`https://files.example/${file.name}`) }} />
  </form>
}

const select = (file: File) => fireEvent.change(screen.getByLabelText('PAN card'), { target: { files: [file] } })

describe('document uploads', () => {
  it('opens the picker for replacement and keeps preview separate', () => {
    render(<Harness />)
    const input = screen.getByLabelText('PAN card')
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Replace PAN card' }))
    expect(click).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Preview original.pdf' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(click).toHaveBeenCalledOnce()
  })

  it('shows a local image preview and removes the saved value', async () => {
    render(<Harness />)
    select(new File(['image'], 'photo.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByAltText('photo.png')).toHaveAttribute('src', 'blob:preview'))
    fireEvent.click(screen.getByRole('button', { name: 'Remove PAN card' }))
    expect(screen.getByRole('button', { name: 'Upload PAN card' })).toBeInTheDocument()
    expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('preserves the previous file on failure and allows retrying the same file', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(undefined)
    render(<Harness upload={upload} />)
    const file = new File(['pdf'], 'replacement.pdf', { type: 'application/pdf' })
    select(file)
    await screen.findByRole('alert')
    expect(screen.getByText('original.pdf')).toBeInTheDocument()
    expect(screen.getByLabelText('PAN card')).toHaveValue('')
    select(file)
    await screen.findByText('replacement.pdf')
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it('rejects unsupported drops without uploading or losing the original', () => {
    const upload = vi.fn()
    render(<Harness upload={upload} />)
    fireEvent.drop(screen.getByRole('button', { name: 'Replace PAN card' }), { dataTransfer: { files: [new File(['bad'], 'script.html', { type: 'text/html' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('supported file')
    expect(screen.getByText('original.pdf')).toBeInTheDocument()
    expect(upload).not.toHaveBeenCalled()
  })

  it('rejects empty and oversized files', () => {
    const upload = vi.fn()
    render(<Harness upload={upload} />)
    select(new File([], 'empty.pdf', { type: 'application/pdf' }))
    expect(screen.getByRole('alert')).toHaveTextContent('empty')
    const large = new File(['pdf'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(large, 'size', { value: 11 * 1024 * 1024 })
    select(large)
    expect(screen.getByRole('alert')).toHaveTextContent('Max 10MB')
    expect(upload).not.toHaveBeenCalled()
  })

  it('blocks overlapping uploads and removal until the request finishes', async () => {
    let finish!: () => void
    const upload = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    render(<Harness upload={upload} />)
    const file = new File(['pdf'], 'new.pdf', { type: 'application/pdf' })
    select(file)
    expect(screen.getByRole('button', { name: 'Remove PAN card' })).toBeDisabled()
    select(file)
    expect(upload).toHaveBeenCalledOnce()
    finish()
    await screen.findByText('new.pdf')
  })
})
