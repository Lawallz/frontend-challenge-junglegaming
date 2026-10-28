import { redirect } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router'
import { ApiError } from '@/shared/api/errors'
import { getSession } from './auth-api'
import { clearPrivateQueryCache, clearSessionExpired, clearSessionExpiry, clearSessionToken, isSessionLocallyExpired, SESSION_QUERY_KEY, safeInternalReturnTo, wasSessionExpired } from './session'

export async function requireSession({ context, location }: { context: RouterContext; location: { href: string } }) {
  try {
    const session = await context.queryClient.fetchQuery({
      queryKey: SESSION_QUERY_KEY,
      queryFn: getSession,
      staleTime: 0,
      retry: false,
    })
    if (session) return { user: session.user }
  } catch (error) {
    if (!(error instanceof ApiError) || !['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(error.code)) throw error
    const expired = error.code === 'SESSION_EXPIRED' || wasSessionExpired() || isSessionLocallyExpired()
    clearSessionToken()
    clearPrivateQueryCache(context.queryClient)
    context.queryClient.setQueryData(SESSION_QUERY_KEY, null)
    clearSessionExpired()
    clearSessionExpiry()
    throw redirect({ to: '/login', search: { returnTo: safeInternalReturnTo(location.href), reason: expired ? 'expired' : undefined } })
  }
  const expired = wasSessionExpired() || isSessionLocallyExpired()
  clearSessionExpired()
  clearSessionExpiry()
  throw redirect({ to: '/login', search: { returnTo: safeInternalReturnTo(location.href), reason: expired ? 'expired' : undefined } })
}
