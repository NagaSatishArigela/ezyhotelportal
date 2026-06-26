import { createFileRoute } from '@tanstack/react-router'
import { Step6BankAccount } from '@/pages/owner/onboarding/Step6BankAccount'

export const Route = createFileRoute('/owner/onboarding/step6')({
  component: Step6BankAccount,
})
