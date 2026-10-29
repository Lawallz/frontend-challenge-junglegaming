import { http, HttpResponse } from 'msw'
import type { AuthResult, LoginRequest, RegisterRequest, SessionResponse, User, ApiErrorBody } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'

export const MOCK_AUTH_STORAGE_KEY = 'kurio:mock:auth:v1'
export const DEMO_CREDENTIALS = { email: 'demo@kurio.art', password: 'KurioDemo123!' } as const
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24

interface StoredAccount { user: User; passwordHash: string }
interface StoredSession { userId: string; expiresAt: string }
interface MockAuthState {
  accounts: StoredAccount[]
  sessions: Record<string, StoredSession>
  favorites: Record<string, { nftId: string; createdAt: string }[]>
}

const emptyState = (): MockAuthState => ({ accounts: [], sessions: {}, favorites: {} })
let memoryState = emptyState()

export function readMockAuthState(): MockAuthState {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(MOCK_AUTH_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockAuthState>
      return {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        favorites: parsed.favorites && typeof parsed.favorites === 'object' ? parsed.favorites : {},
      }
    }
  } catch { /* Isolated test runtimes use the in-memory store. */ }
  return memoryState
}

export function writeMockAuthState(state: MockAuthState): void {
  memoryState = state
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(state))
  } catch { /* The demo can still operate for the lifetime of this page. */ }
}

export function resetMockAuthState(): void {
  memoryState = emptyState()
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(MOCK_AUTH_STORAGE_KEY) } catch { /* no-op */ }
}

async function passwordHash(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function apiError(status: number, code: ApiErrorBody['code'], message: string, fieldErrors?: Record<string, string>): HttpResponse<ApiErrorBody> {
  return HttpResponse.json({ code, message, ...(fieldErrors ? { fieldErrors } : {}) } satisfies ApiErrorBody, { status })
}

function bearerToken(request: Request): string | undefined {
  const value = request.headers.get('authorization')
  return value?.match(/^Bearer\s+(.+)$/i)?.[1]
}

async function ensureDemoAccount(state: MockAuthState): Promise<void> {
  if (state.accounts.some(({ user }) => user.email === DEMO_CREDENTIALS.email)) return
  const user: User = { id: 'user-kurio-demo', username: 'kurio-demo', email: DEMO_CREDENTIALS.email, displayName: 'Colecionador Kurio', avatarUrl: null }
  state.accounts.push({ user, passwordHash: await passwordHash(DEMO_CREDENTIALS.password) })
}

function issueSession(state: MockAuthState, user: User): AuthResult {
  const accessToken = `kurio-${crypto.randomUUID()}`
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()
  state.sessions[accessToken] = { userId: user.id, expiresAt }
  return { user, accessToken, expiresAt }
}

export function resolveMockSession(request: Request, state = readMockAuthState()): { user: User; expiresAt: string } | HttpResponse<ApiErrorBody> {
  const token = bearerToken(request)
  const session = token ? state.sessions[token] : undefined
  if (!token || !session) return apiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  if (Date.parse(session.expiresAt) <= Date.now()) {
    delete state.sessions[token]
    writeMockAuthState(state)
    return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const account = state.accounts.find(({ user }) => user.id === session.userId)
  if (!account) return apiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  return { user: account.user, expiresAt: session.expiresAt }
}

export const authHandlers = [
  http.post(`*${API_ROUTES.register}`, async ({ request }) => {
    let input: RegisterRequest
    try { input = await request.json() as RegisterRequest } catch { return apiError(400, 'VALIDATION_ERROR', 'Confira os dados informados.') }
    if (!input || typeof input !== 'object') return apiError(400, 'VALIDATION_ERROR', 'Confira os dados informados.')
    const username = input.username?.trim()
    const email = input.email?.trim().toLowerCase()
    const fieldErrors: Record<string, string> = {}
    if (!username || username.length < 3) fieldErrors.username = 'Use pelo menos 3 caracteres.'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
    if (!input.password || input.password.length < 8) fieldErrors.password = 'Use pelo menos 8 caracteres.'
    if (input.password !== input.confirmPassword) fieldErrors.confirmPassword = 'As senhas não coincidem.'
    if (Object.keys(fieldErrors).length) return apiError(400, 'VALIDATION_ERROR', 'Confira os campos destacados.', fieldErrors)

    const state = readMockAuthState()
    await ensureDemoAccount(state)
    if (state.accounts.some(({ user }) => user.email === email || user.username.toLowerCase() === username.toLowerCase())) {
      return apiError(409, 'CONFLICT', 'Já existe uma conta com este e-mail ou nome de usuário.')
    }
    const user: User = { id: `user-${crypto.randomUUID()}`, username, email, displayName: username, avatarUrl: null }
    state.accounts.push({ user, passwordHash: await passwordHash(input.password) })
    const auth = issueSession(state, user)
    writeMockAuthState(state)
    return HttpResponse.json(auth, { status: 201 })
  }),
  http.post(`*${API_ROUTES.login}`, async ({ request }) => {
    let input: LoginRequest
    try { input = await request.json() as LoginRequest } catch { return apiError(400, 'VALIDATION_ERROR', 'Informe seu e-mail e senha.') }
    const state = readMockAuthState()
    await ensureDemoAccount(state)
    const account = state.accounts.find(({ user }) => user.email === input.email?.trim().toLowerCase())
    if (!account || account.passwordHash !== await passwordHash(input.password ?? '')) {
      writeMockAuthState(state)
      return apiError(401, 'UNAUTHENTICATED', 'E-mail ou senha incorretos.')
    }
    const auth = issueSession(state, account.user)
    writeMockAuthState(state)
    return HttpResponse.json(auth)
  }),
  http.get(`*${API_ROUTES.session}`, ({ request }) => {
    const state = readMockAuthState()
    const session = resolveMockSession(request, state)
    if (session instanceof HttpResponse) return session
    return HttpResponse.json({ user: session.user, expiresAt: session.expiresAt } satisfies SessionResponse)
  }),
  http.post(`*${API_ROUTES.logout}`, ({ request }) => {
    const token = bearerToken(request)
    if (token) {
      const state = readMockAuthState()
      delete state.sessions[token]
      writeMockAuthState(state)
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
export async function updateMockPassword(userId:string,currentPassword:string,newPassword:string):Promise<boolean>{const state=readMockAuthState(),account=state.accounts.find(({user})=>user.id===userId);if(!account||account.passwordHash!==await passwordHash(currentPassword))return false;account.passwordHash=await passwordHash(newPassword);writeMockAuthState(state);return true}
