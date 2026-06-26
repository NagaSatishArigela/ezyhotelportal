import { createFileRoute } from '@tanstack/react-router'
import { Step4LegalTax } from '@/pages/owner/onboarding/Step4LegalTax'

export const Route = createFileRoute('/owner/onboarding/step4')({
  component: Step4LegalTax,
})
