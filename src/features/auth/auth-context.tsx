import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthResult, LoginRequest, RegisterRequest, SessionResponse } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { getSession, loginAccount, logoutAccount, registerAccount } from './auth-api'
import { clearPrivateQueryCache, clearSessionExpired, clearSessionExpiry, clearSessionToken, markSessionExpired, SESSION_QUERY_KEY, setSessionToken } from './session'

interface AuthContextValue {
  session: SessionResponse | null
  isLoading: boolean
  login: (input: LoginRequest) => Promise<AuthResult>
  register: (input: RegisterRequest) => Promise<AuthResult>
  logout: () => Promise<void>
  handleSessionExpired: (expired?: boolean) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSession,
    staleTime: 30_000,
    retry: false,
  })

  const handleSessionExpired = useCallback((expired = false) => {
    if (expired) markSessionExpired()
    clearSessionToken()
    clearPrivateQueryCache(queryClient)
    queryClient.setQueryData<SessionResponse | null>(SESSION_QUERY_KEY, null)
  }, [queryClient])

  useEffect(() => {
    if (sessionQuery.error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(sessionQuery.error.code)) {
      handleSessionExpired(sessionQuery.error.code === 'SESSION_EXPIRED')
    }
  }, [handleSessionExpired, sessionQuery.error])

  const acceptAuthResult = useCallback((result: AuthResult) => {
    clearSessionExpired()
    const previous = queryClient.getQueryData<SessionResponse | null>(SESSION_QUERY_KEY)
    if (previous?.user.id && previous.user.id !== result.user.id) clearPrivateQueryCache(queryClient)
    setSessionToken(result.accessToken, result.expiresAt)
    queryClient.setQueryData<SessionResponse>(SESSION_QUERY_KEY, { user: result.user, expiresAt: result.expiresAt })
    return result
  }, [queryClient])

  const login = useCallback(async (input: LoginRequest) => acceptAuthResult(await loginAccount(input)), [acceptAuthResult])
  const register = useCallback(async (input: RegisterRequest) => acceptAuthResult(await registerAccount(input)), [acceptAuthResult])

  const logout = useCallback(async () => {
    try { await logoutAccount() } catch { /* Clear local session even after the server session has expired. */ }
    clearSessionToken()
    clearSessionExpired()
    clearSessionExpiry()
    clearPrivateQueryCache(queryClient)
    queryClient.setQueryData<SessionResponse | null>(SESSION_QUERY_KEY, null)
  }, [queryClient])

  const value: AuthContextValue = {
    session: sessionQuery.data ?? null,
    isLoading: sessionQuery.isPending,
    login,
    register,
    logout,
    handleSessionExpired,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return value
}
