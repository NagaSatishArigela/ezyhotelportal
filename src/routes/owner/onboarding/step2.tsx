import { createFileRoute } from '@tanstack/react-router'
import { Step2RoomsPricing } from '@/pages/owner/onboarding/Step2RoomsPricing'

export const Route = createFileRoute('/owner/onboarding/step2')({
  component: Step2RoomsPricing,
})
