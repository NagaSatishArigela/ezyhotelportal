import { useEffect, useState } from 'react'
import { Step1PropertyDetails as AccountForm } from './OnboardingScreens'
import { ListingChecklist } from '@/components/owner/ListingChecklist'
import { useOnboardingStore } from '@/store/onboarding.store'
import { Button } from '@/components/ui/button'

export function Step1PropertyDetails() {
  const [started, setStarted] = useState(() => !!useOnboardingStore.getState().stepData[1])
  useEffect(() => {
    if (started) return
    useOnboardingStore.getState().setOnBeforeNext(async () => {
      throw Object.assign(new Error('Review the documents checklist, then choose Start listing.'), { isValidation: true })
    })
    return () => useOnboardingStore.getState().setOnBeforeNext(null)
  }, [started])
  if (started) return <AccountForm />
  return <div className="space-y-5"><ListingChecklist /><Button onClick={() => setStarted(true)}>Start listing</Button></div>
}
