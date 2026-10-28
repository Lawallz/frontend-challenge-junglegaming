import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { cartHandlers, resetMockCart } from './cart'

const server = setupServer(...cartHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockCart()
})
afterAll(() => server.close())

describe('cart MSW handlers', () => {
  it('adds an available edition and returns the cart on GET', async () => {
    const response = await fetch('http://localhost/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-002', editionId: 'nft-002-edition-1', quantity: 1 }),
    })

    expect(response.status).toBe(200)
    const cart = await response.json()
    expect(cart.version).toBe(1)
    expect(cart.items).toMatchObject([{ nftId: 'nft-002', quantity: 1, unitPrice: '0.35', available: 1 }])

    const readResponse = await fetch('http://localhost/api/cart')
    expect(await readResponse.json()).toEqual(cart)
  })

  it('rejects additions beyond the available stock', async () => {
    const request = () => fetch('http://localhost/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-002', editionId: 'nft-002-edition-1', quantity: 1 }),
    })
    await request()
    const response = await request()
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'AVAILABILITY_CONFLICT' })
  })
})
