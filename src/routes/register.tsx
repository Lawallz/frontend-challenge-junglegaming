import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/auth-pages'
import { safeInternalReturnTo } from '@/features/auth/session'

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeInternalReturnTo(search.returnTo) }),
  component: RegisterRoute,
})

function RegisterRoute() {
  const { returnTo } = Route.useSearch()
  return <AuthPage mode="register" returnTo={returnTo} />
}
