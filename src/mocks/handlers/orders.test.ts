import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import type { CreateOrderRequest } from '@/shared/api/contracts'
import { IDEMPOTENCY_HEADER } from '@/shared/api/contracts'
import { resetMockAuthState, authHandlers } from './auth'
import { cartHandlers, resetMockCart } from './cart'
import { orderHandlers, resetMockOrders } from './orders'
import { resetMockWallets, walletHandlers } from './wallets'
import { resetMockScenario, setMockScenario } from '../scenarios'

const server = setupServer(...authHandlers, ...cartHandlers, ...walletHandlers, ...orderHandlers)
const json = { 'Content-Type': 'application/json' }
let headers: Record<string, string>
let request: CreateOrderRequest

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  resetMockAuthState()
  resetMockCart()
  resetMockWallets()
  resetMockOrders()
  resetMockScenario()
})

async function prepare() {
  const registered = await fetch('http://localhost/api/auth/register', { method: 'POST', headers: json, body: JSON.stringify({ username: 'order-user', email: 'order-user@kurio.art', password: 'KurioPass123!', confirmPassword: 'KurioPass123!' }) }).then((response) => response.json())
  headers = { ...json, Authorization: `Bearer ${registered.accessToken}` }
  await fetch('http://localhost/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId: 'nft-005', editionId: 'nft-005-edition-2', quantity: 2 }) })
  const wallet = await fetch('http://localhost/api/wallets', { method: 'POST', headers, body: JSON.stringify({ role: 'primary', label: 'Demo', address: `0x${'0'.repeat(39)}1`, network: 'ethereum-mainnet', walletType: 'metamask' }) }).then((response) => response.json())
  const quote = await fetch('http://localhost/api/quotes', { method: 'POST', headers, body: JSON.stringify({ network: 'ethereum-mainnet' }) }).then((response) => response.json())
  request = { quoteId: quote.id, acceptedTotal: quote.total, walletId: wallet.id, network: 'ethereum-mainnet', buyer: { displayName: 'Order User', email: 'order-user@kurio.art' } }
}

async function create(input = request, key = 'test-key') {
  return fetch('http://localhost/api/orders', { method: 'POST', headers: { ...headers, [IDEMPOTENCY_HEADER]: key }, body: JSON.stringify(input) })
}

describe('order mock handlers', () => {
  it('revalidates the server quote, creates a pending immutable snapshot, and clears cart only after success', async () => {
    await prepare()
    const response = await create()
    expect(response.status, await response.clone().text()).toBe(201)
    const order = await response.json()
    expect(order).toMatchObject({ status: 'pending', transactionRef: null, snapshot: { total: request.acceptedTotal, lines: [{ quantity: 2, nftId: 'nft-005' }] } })
    expect(await (await fetch('http://localhost/api/cart', { headers })).json()).toMatchObject({ items: [], version: 2 })
    const persisted = await fetch(`http://localhost/api/orders/${order.id}`, { headers })
    expect(await persisted.json()).toEqual(order)
  })

  it('returns same order for same key/body and conflicts when the body changes', async () => {
    await prepare()
    const first = await create()
    const order = await first.json()
    const repeated = await create()
    expect(repeated.status).toBe(200)
    expect(await repeated.json()).toEqual(order)
    const different = await create({ ...request, buyer: { ...request.buyer, displayName: 'Changed' } })
    expect(different.status).toBe(409)
    expect(await different.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  it('rejects when stock changes after quote and preserves cart', async () => {
    await prepare()
    setMockScenario('checkout-stock-changed')
    const response = await create()
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'AVAILABILITY_CONFLICT' })
    expect((await (await fetch('http://localhost/api/cart', { headers })).json()).items).toHaveLength(1)
  })

  it('reproduces transient order failure without clearing the cart', async () => {
    await prepare()
    setMockScenario('checkout-failure')
    const response = await create()
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'TRANSIENT_FAILURE' })
    expect((await (await fetch('http://localhost/api/cart', { headers })).json()).items).toHaveLength(1)
  })
})
