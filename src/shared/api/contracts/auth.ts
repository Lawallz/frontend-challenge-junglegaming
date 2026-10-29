import type { IsoDateString } from './common'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
  ensName?: string | null
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginRequest {
  email: string
  password: string
}

/** Resposta de login/cadastro. O token é opaco e vive só em memória/sessão do cliente. */
export interface AuthResult {
  user: User
  accessToken: string
  expiresAt: IsoDateString
}

/** GET /auth/session. */
export interface SessionResponse {
  user: User
  expiresAt: IsoDateString
}
