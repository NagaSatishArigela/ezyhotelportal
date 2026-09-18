import { useEffect } from 'react'
import { useOnboardingStore } from '@/store/onboarding.store'
import { Button } from '@/components/ui/button'

export function SavedCompliance() {
  const saved = useOnboardingStore(s => s.savedCompliance)
  const edit = useOnboardingStore(s => s.editCompliance)
  const setOnBeforeNext = useOnboardingStore(s => s.setOnBeforeNext)
  useEffect(() => {
    setOnBeforeNext(async () => {})
    return () => setOnBeforeNext(null)
  }, [setOnBeforeNext])
  if (!saved) return null
  return <section className="space-y-4 rounded-lg border bg-white p-5">
    <h1 className="text-xl font-bold">Saved legal and payout details</h1>
    <p>Your previously saved details and documents will be kept when you submit. Sensitive values remain masked.</p>
    <dl className="space-y-2"><dt>Legal business name</dt><dd>{saved.legalBusinessName}</dd>
      <dt>Account holder</dt><dd>{saved.accountHolderName}</dd>
      <dt>Bank account</dt><dd>{saved.bankAccountNumberMasked}</dd>
      <dt>IFSC</dt><dd>{saved.ifsc}</dd><dt>PAN</dt><dd>{saved.panMasked}</dd>
      {saved.gstinMasked && <><dt>GSTIN</dt><dd>{saved.gstinMasked}</dd></>}
    </dl>
    <h2 className="font-semibold">Saved documents</h2>
    <ul>{saved.documents.map((document, i) => <li key={document.type + i}>{document.type.replace(/_/g, ' ')} - {document.status}</li>)}</ul>
    <p>To replace these details, re-enter the legal and bank information and upload the required documents. The saved values remain on the server until the replacement is complete.</p>
    <Button variant="outline" onClick={edit}>Replace legal and payout details</Button>
  </section>
}
