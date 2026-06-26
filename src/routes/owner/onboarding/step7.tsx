import { createFileRoute } from '@tanstack/react-router'
import { Step7ReviewSubmit } from '@/pages/owner/onboarding/Step7ReviewSubmit'

export const Route = createFileRoute('/owner/onboarding/step7')({
  component: Step7ReviewSubmit,
})
