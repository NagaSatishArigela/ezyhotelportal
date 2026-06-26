import { createFileRoute } from '@tanstack/react-router'
import { SuperAdminAdminsPage } from '@/pages/super-admin/SuperAdminAdminsPage'

export const Route = createFileRoute('/super-admin/admins')({
  component: SuperAdminAdminsPage,
})
