import { createRoot } from 'react-dom/client'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/auth.store'
import { queryClient } from '../../src/lib/queryClient'
import { routeTree } from '../../src/routeTree.gen'
import '../../src/index.css'
const options = new URLSearchParams(location.search)
const id = '11111111-1111-4111-8111-111111111111'
const token = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })) + '.signature'
useAuthStore.getState().setAuth({ id: 'walkthrough-owner', name: 'Test Owner', email: 'owner@example.test', phone: '9000000001', role: 'applicant', avatarInitials: 'TO', propertyId: options.has('resume') ? id : undefined, onboardingStatus: 'in_progress' }, token, false, 'test-refresh')
const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/owner/onboarding/step' + (options.get('step') || '1')] }) })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>)

