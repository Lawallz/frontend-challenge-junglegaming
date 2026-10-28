import type { AuthResult, LoginRequest, RegisterRequest, SessionResponse } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { http } from '@/shared/api/http'
import { getSessionToken } from './session'

const authConfig = () => {
  const token = getSessionToken()
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
}

export async function registerAccount(input: RegisterRequest): Promise<AuthResult> {
  return (await http.post<AuthResult>(API_ROUTES.register, input)).data
}

export async function loginAccount(input: LoginRequest): Promise<AuthResult> {
  return (await http.post<AuthResult>(API_ROUTES.login, input)).data
}

export async function getSession(): Promise<SessionResponse | null> {
  if (!getSessionToken()) return null
  return (await http.get<SessionResponse>(API_ROUTES.session, authConfig())).data
}

export async function logoutAccount(): Promise<void> {
  await http.post(API_ROUTES.logout, undefined, authConfig())
}
