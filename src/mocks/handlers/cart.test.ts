import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { authHandlers, resetMockAuthState } from './auth'
import { cartHandlers, resetMockCart } from './cart'
import { resetMockScenario, setMockScenario } from '../scenarios'

const server = setupServer(...authHandlers, ...cartHandlers)
const jsonHeaders = { 'Content-Type': 'application/json' }

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockCart()
  resetMockAuthState()
  resetMockScenario()
})
afterAll(() => server.close())

async function add(nftId = 'nft-005', editionId = 'nft-005-edition-2', quantity = 1, headers = jsonHeaders) {
  return fetch('http://localhost/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId, editionId, quantity }) })
}

async function register(email: string) {
  const response = await fetch('http://localhost/api/auth/register', {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ username: email.split('@')[0], email, password: 'KurioPass123!', confirmPassword: 'KurioPass123!' }),
  })
  return response.json()
}

describe('cart and quote MSW handlers', () => {
  it('adds, updates, removes, and re-reads an item with the latest stock', async () => {
    const added = await add('nft-005', 'nft-005-edition-2', 2)
    expect(added.status).toBe(200)
    expect(await added.json()).toMatchObject({ version: 1, items: [{ quantity: 2, available: 3 }] })

    const updated = await fetch('http://localhost/api/cart/items/nft-005/nft-005-edition-2', {
      method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ quantity: 3 }),
    })
    expect((await updated.json()).items[0]).toMatchObject({ quantity: 3, available: 3 })

    const unavailable = await fetch('http://localhost/api/cart/items/nft-005/nft-005-edition-2', {
      method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ quantity: 4 }),
    })
    expect(unavailable.status).toBe(409)
    expect(await unavailable.json()).toMatchObject({ code: 'AVAILABILITY_CONFLICT' })

    const removed = await fetch('http://localhost/api/cart/items/nft-005/nft-005-edition-2', { method: 'DELETE' })
    expect(await removed.json()).toMatchObject({ items: [], version: 3 })
  })

  it('keeps guest and account carts separate, then merges without duplicate lines', async () => {
    await add('nft-005', 'nft-005-edition-2', 1)
    const firstAuth = await register('first-cart@kurio.art')
    const firstHeaders = { Authorization: `Bearer ${firstAuth.accessToken}` }
    const initiallyPrivate = await fetch('http://localhost/api/cart', { headers: firstHeaders })
    expect((await initiallyPrivate.json()).items).toEqual([])

    const merged = await fetch('http://localhost/api/cart/merge', { method: 'POST', headers: firstHeaders })
    expect((await merged.json()).items).toMatchObject([{ nftId: 'nft-005', quantity: 1 }])
    await add('nft-005', 'nft-005-edition-2', 1, { ...jsonHeaders, ...firstHeaders })

    await add('nft-005', 'nft-005-edition-2', 1)
    const mergedAgain = await fetch('http://localhost/api/cart/merge', { method: 'POST', headers: firstHeaders })
    const accountCart = await mergedAgain.json()
    expect(accountCart.items).toHaveLength(1)
    expect(accountCart.items[0].quantity).toBe(3)

    const guestCart = await (await fetch('http://localhost/api/cart')).json()
    expect(guestCart.items).toEqual([])
  })

  it('applies a valid coupon, rejects invalid and expired codes, and quotes exact ETH totals', async () => {
    await add('nft-005', 'nft-005-edition-2', 2)
    const apply = (code: string) => fetch('http://localhost/api/cart/coupon', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ code }) })
    expect((await apply('kurio10')).status).toBe(200)
    expect((await apply('NOT-A-COUPON')).status).toBe(422)
    expect(await (await apply('NOT-A-COUPON')).json()).toMatchObject({ code: 'COUPON_INVALID' })
    expect(await (await apply('KURIOEXPIRED')).json()).toMatchObject({ code: 'COUPON_EXPIRED' })

    const quote = await fetch('http://localhost/api/quotes', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ network: 'ethereum-mainnet' }) })
    expect(await quote.json()).toMatchObject({ subtotal: '0.16', discount: '0.016', networkFee: '0.016', total: '0.16', couponCode: 'KURIO10', issues: [] })
  })

  it('quotes an empty cart at zero and supports simulated failure and latency scenarios', async () => {
    const emptyQuote = await fetch('http://localhost/api/quotes', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ network: 'polygon' }) })
    expect(await emptyQuote.json()).toMatchObject({ subtotal: '0', discount: '0', networkFee: '0', total: '0' })

    setMockScenario('cart-resilience')
    const startedAt = Date.now()
    expect((await fetch('http://localhost/api/cart')).status).toBe(200)
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(850)

    setMockScenario('cart-failure')
    expect((await fetch('http://localhost/api/cart')).status).toBe(503)
    expect((await fetch('http://localhost/api/quotes', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ network: 'polygon' }) })).status).toBe(503)
    resetMockScenario()
  })
})
