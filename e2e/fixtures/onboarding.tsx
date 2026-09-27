import { createRoot } from 'react-dom/client'
import { Step3Policies, Step6BankAccount } from '../../src/pages/owner/onboarding/OnboardingScreens'
import { useAuthStore } from '../../src/store/auth.store'
import { restoreApplication } from '../../src/lib/onboarding-session'
import { useSessionExpiry } from '../../src/hooks/useSessionExpiry'
import '../../src/index.css'
const id = '11111111-1111-4111-8111-111111111111'
const options = new URLSearchParams(location.search)
const token = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + (options.has('renew') ? 1 : 900) })) + '.signature'
useAuthStore.getState().setAuth({ id: 'browser-owner', name: 'Owner', email: 'owner@example.test', phone: '9000000001', role: 'applicant', avatarInitials: 'O', propertyId: id, onboardingStatus: 'in_progress' }, token, false, 'test-refresh')
function Screen() {
  useSessionExpiry()
  const authenticated = useAuthStore(s => s.isAuthenticated)
  return <main className="mx-auto max-w-4xl p-4"><span data-testid="authenticated">{String(authenticated)}</span>{options.get('screen') === 'bank' ? <Step6BankAccount /> : <Step3Policies />}</main>
}
restoreApplication(id).then(() => createRoot(document.getElementById('root')!).render(<Screen />))
