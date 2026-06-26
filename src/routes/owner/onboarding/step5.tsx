import { createFileRoute } from '@tanstack/react-router'
import { Step5Documents } from '@/pages/owner/onboarding/Step5Documents'

export const Route = createFileRoute('/owner/onboarding/step5')({
  component: Step5Documents,
})
