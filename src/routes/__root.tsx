import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router'
import { Toaster } from 'sonner'

function RootErrorComponent({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-50 p-6 text-center">
      <div className="rounded-xl border border-error-200 bg-white p-8 shadow-sm max-w-md w-full">
        <p className="text-2xl font-bold text-navy-900 mb-2">Something went wrong</p>
        <p className="text-sm text-navy-500 mb-6">{error.message || 'An unexpected error occurred. Please try again.'}</p>
        <button
          onClick={() => router.invalidate()}
          className="rounded-[10px] bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton expand={false} />
    </>
  ),
  errorComponent: ({ error }) => <RootErrorComponent error={error as Error} />,
})
