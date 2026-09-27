import { useState } from 'react'
import { documentRequirements } from '@/lib/document-requirements'

export function ListingChecklist() {
  const [entity, setEntity] = useState('individual')
  const [gst, setGst] = useState(false)
  const [food, setFood] = useState(false)
  const docs = documentRequirements(entity, gst, food ? ['restaurant'] : [])
  return <section className="space-y-5 rounded-2xl border border-orange-200 bg-white p-5 sm:p-7">
    <div><p className="text-xs font-bold uppercase tracking-wider text-primary-700">Before you begin</p>
      <h2 className="mt-2 text-2xl font-bold text-navy-900">Documents you’ll need</h2>
      <p className="mt-2 text-sm text-navy-600">Keep these ready before listing your property. You can start now and upload them in Documents &amp; KYC later.</p></div>
    <label className="block text-sm font-semibold">Business type
      <select className="mt-2 block w-full rounded-lg border p-3" value={entity} onChange={e => setEntity(e.target.value)}>
        <option value="individual">Individual</option><option value="sole_proprietor">Sole proprietor</option>
        <option value="partnership">Partnership</option><option value="llp">LLP</option>
        <option value="private_limited">Private limited company</option><option value="public_limited">Public limited company</option>
      </select>
    </label>
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={gst} onChange={e => setGst(e.target.checked)} />GST registered</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={food} onChange={e => setFood(e.target.checked)} />Restaurant, bar or room service</label>
    </div>
    <ul className="grid gap-3 sm:grid-cols-2">{docs.map(doc => <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3 text-sm">
      <span>{doc.label}</span><span className="text-xs font-semibold text-primary-700">{doc.required ? 'Required' : 'Optional'}</span>
    </li>)}</ul>
    <p className="text-sm text-navy-600">GST is optional for listing. If you provide a GST number, keep its certificate ready. Entity documents depend on your business type. FSSAI is required when you offer restaurant, bar or room service.</p>
    <div className="rounded-xl border p-4 text-sm text-navy-600 space-y-2">
      <p><strong>Documents:</strong> PDF, JPG or PNG, up to 10 MB each.</p>
      <p><strong>Property photos:</strong> JPG, PNG or WebP, up to 10 MB each. Have clear exterior and room photos ready.</p>
      <p><strong>Payout details:</strong> Account holder name, bank account number, IFSC and PAN.</p>
    </div>
  </section>
}
