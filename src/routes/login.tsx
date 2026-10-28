import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/auth-pages'
import { safeInternalReturnTo } from '@/features/auth/session'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: safeInternalReturnTo(search.returnTo),
    reason: search.reason === 'expired' ? 'expired' as const : undefined,
  }),
  component: LoginRoute,
})

function LoginRoute() {
  const { returnTo, reason } = Route.useSearch()
  return <AuthPage mode="login" returnTo={returnTo} reason={reason} />
}
