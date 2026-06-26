import { createFileRoute } from '@tanstack/react-router'
import { Step1PropertyDetails } from '@/pages/owner/onboarding/Step1PropertyDetails'

export const Route = createFileRoute('/owner/onboarding/step1')({
  component: Step1PropertyDetails,
})
