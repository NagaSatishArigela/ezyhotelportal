import { createFileRoute } from '@tanstack/react-router'
import { PlatformDirectoryPage } from '@/pages/super-admin/PlatformDirectoryPage'
export const Route = createFileRoute('/super-admin/properties')({
  component: () => <PlatformDirectoryPage kind="properties" />,
})
