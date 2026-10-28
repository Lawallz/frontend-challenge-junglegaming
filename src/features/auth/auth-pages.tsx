import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import type { LoginRequest, RegisterRequest } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { useAuth } from './auth-context'
import { safeInternalReturnTo } from './session'

type AuthMode = 'login' | 'register'

export function AuthPage({ mode, returnTo, reason }: { mode: AuthMode; returnTo: string; reason?: string }) {
  const router = useRouter()
  const { login, register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isLogin = mode === 'login'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      if (isLogin) {
        const credentials: LoginRequest = { email, password }
        await login(credentials)
      } else {
        const credentials: RegisterRequest = { username, email, password, confirmPassword }
        await register(credentials)
      }
      await router.navigate({ to: safeInternalReturnTo(returnTo) as never, replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível concluir. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-decoration" aria-hidden="true"><span /><span /><span /></div>
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-wordmark" to="/">KURIO</Link>
        <p className="auth-eyebrow">CULTURA DIGITAL, EM PRIMEIRA MÃO</p>
        <h1 id="auth-title">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta Kurio'}</h1>
        <p className="auth-subtitle">{isLogin ? 'Entre para acompanhar sua coleção e seus favoritos.' : 'Junte-se a uma comunidade que coleciona cultura.'}</p>
        {reason === 'expired' && <p className="auth-notice" role="status">Sua sessão expirou. Entre novamente para continuar.</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {!isLogin && <label>Nome de usuário<span className="auth-input"><UserRound /><input autoComplete="username" minLength={3} required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Seu nome" /></span></label>}
          <label>E-mail<span className="auth-input"><Mail /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></span></label>
          <label>Senha<span className="auth-input"><LockKeyhole /><input type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" /></span></label>
          {!isLogin && <label>Confirme sua senha<span className="auth-input"><LockKeyhole /><input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita sua senha" /></span></label>}
          <button className="auth-submit" type="submit" disabled={pending}>{pending ? 'Aguarde…' : isLogin ? 'Entrar na Kurio' : 'Criar conta'}<ArrowRight /></button>
        </form>

        <p className="auth-switch">{isLogin ? 'Ainda não tem uma conta?' : 'Já faz parte da Kurio?'} {isLogin ? <Link to="/register" search={{ returnTo: safeInternalReturnTo(returnTo) }}>Cadastre-se</Link> : <Link to="/login" search={{ returnTo: safeInternalReturnTo(returnTo), reason: undefined }}>Entre</Link>}</p>
        {!isLogin && <p className="auth-terms">Ao criar sua conta, você concorda com os termos e a política de privacidade da Kurio.</p>}
      </section>
    </main>
  )
}
