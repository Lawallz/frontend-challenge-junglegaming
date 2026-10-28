import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { authHandlers, DEMO_CREDENTIALS, resetMockAuthState } from './auth'
import { favoriteHandlers } from './favorites'

const server = setupServer(...authHandlers, ...favoriteHandlers)
const jsonHeaders = { 'Content-Type': 'application/json' }

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockAuthState()
})
afterAll(() => server.close())

async function register(email: string, username = 'collector') {
  return fetch('http://localhost/api/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, email, password: 'KurioPass123!', confirmPassword: 'KurioPass123!' }),
  })
}

describe('auth and favorites MSW handlers', () => {
  it('registers a user, rejects duplicate email, restores and ends a session', async () => {
    const created = await register('new@kurio.art')
    expect(created.status).toBe(201)
    const auth = await created.json()

    const duplicate = await register('new@kurio.art', 'another-user')
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({ code: 'CONFLICT' })

    const session = await fetch('http://localhost/api/auth/session', { headers: { Authorization: `Bearer ${auth.accessToken}` } })
    expect(await session.json()).toMatchObject({ user: { email: 'new@kurio.art' } })

    await fetch('http://localhost/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${auth.accessToken}` } })
    const ended = await fetch('http://localhost/api/auth/session', { headers: { Authorization: `Bearer ${auth.accessToken}` } })
    expect(ended.status).toBe(401)
    expect(await ended.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects invalid credentials and supports the demo account', async () => {
    const invalid = await fetch('http://localhost/api/auth/login', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email: 'demo@kurio.art', password: 'wrong-password' }) })
    expect(invalid.status).toBe(401)
    expect(await invalid.json()).toMatchObject({ code: 'UNAUTHENTICATED' })

    const valid = await fetch('http://localhost/api/auth/login', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(DEMO_CREDENTIALS) })
    expect(valid.status).toBe(200)
    expect((await valid.json()).user.email).toBe(DEMO_CREDENTIALS.email)
  })

  it('requires authentication and keeps favorites isolated per account', async () => {
    const unauthorized = await fetch('http://localhost/api/favorites')
    expect(unauthorized.status).toBe(401)

    const first = await (await register('first@kurio.art', 'first-user')).json()
    const firstAuth = { Authorization: `Bearer ${first.accessToken}` }
    const favorite = await fetch('http://localhost/api/favorites/nft-001', { method: 'POST', headers: firstAuth })
    expect(favorite.status).toBe(201)
    expect(await favorite.json()).toMatchObject({ nftId: 'nft-001' })
    expect((await (await fetch('http://localhost/api/favorites', { headers: firstAuth })).json()).items).toHaveLength(1)

    const second = await (await register('second@kurio.art', 'second-user')).json()
    const secondAuth = { Authorization: `Bearer ${second.accessToken}` }
    expect((await (await fetch('http://localhost/api/favorites', { headers: secondAuth })).json()).items).toEqual([])
  })
})
