import { createFileRoute } from '@tanstack/react-router'
import { Step3Policies } from '@/pages/owner/onboarding/Step3Policies'

export const Route = createFileRoute('/owner/onboarding/step3')({
  component: Step3Policies,
})
