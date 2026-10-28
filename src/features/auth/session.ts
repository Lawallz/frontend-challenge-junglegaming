import type { QueryClient } from '@tanstack/react-query'

export const SESSION_TOKEN_KEY = 'kurio:session-token'
export const SESSION_EXPIRES_AT_KEY = 'kurio:session-expires-at'
export const SESSION_EXPIRED_KEY = 'kurio:session-expired'
export const SESSION_QUERY_KEY = ['auth', 'session'] as const

export function getSessionToken(): string | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(SESSION_TOKEN_KEY) } catch { return null }
}

export function setSessionToken(token: string, expiresAt: string): void {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token)
    sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, expiresAt)
  } catch { /* Session-only persistence is best-effort. */ }
}

export function clearSessionToken(): void {
  try { sessionStorage.removeItem(SESSION_TOKEN_KEY) } catch { /* no-op */ }
}

export function clearSessionExpiry(): void {
  try { sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY) } catch { /* no-op */ }
}

export function isSessionLocallyExpired(): boolean {
  try {
    const expiresAt = sessionStorage.getItem(SESSION_EXPIRES_AT_KEY)
    return expiresAt !== null && Date.parse(expiresAt) <= Date.now()
  } catch { return false }
}

export function markSessionExpired(): void {
  try { sessionStorage.setItem(SESSION_EXPIRED_KEY, '1') } catch { /* no-op */ }
}

export function wasSessionExpired(): boolean {
  try { return sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1' } catch { return false }
}

export function clearSessionExpired(): void {
  try { sessionStorage.removeItem(SESSION_EXPIRED_KEY) } catch { /* no-op */ }
}

const PRIVATE_QUERY_ROOTS = new Set(['favorites', 'cart', 'profile', 'orders', 'wallets'])

export function clearPrivateQueryCache(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: ({ queryKey }) => typeof queryKey[0] === 'string' && PRIVATE_QUERY_ROOTS.has(queryKey[0]) })
}

/** Keep post-login redirects on this origin and reject protocol-relative/backslash paths. */
export function safeInternalReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some((character) => character.charCodeAt(0) < 0x20)) return '/'
  try {
    const url = new URL(value, 'https://kurio.invalid')
    if (url.origin !== 'https://kurio.invalid') return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return '/' }
}
