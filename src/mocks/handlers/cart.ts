import { http, HttpResponse } from 'msw'
import type { AddCartItemRequest, ApiErrorBody, ApplyCouponRequest, Cart, CartItem, Quote, QuoteRequest, UpdateCartItemRequest } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { addEth, mulEthByQuantity, normalizeEth, parseEth, subEth, sumEth, ZERO_ETH } from '@/shared/lib/eth'
import { getScenario } from '../scenarios'
import { nftFixtures } from '../fixtures/nfts'
import { resolveMockSession } from './auth'

export const MOCK_CART_STORAGE_KEY = 'kurio:mock:carts:v1'
export const MOCK_QUOTES_STORAGE_KEY = 'kurio:mock:quotes:v1'
const emptyCart = (): Cart => ({ items: [], couponCode: null, version: 0 })
const validCoupons: Record<string, 'KURIO10'> = { KURIO10: 'KURIO10' }
const expiredCoupons = new Set(['KURIOEXPIRED'])
let memoryCarts: Record<string, Cart> = {}
let memoryQuotes: Record<string, Record<string, Quote>> = {}

function readCartStore(): Record<string, Cart> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(MOCK_CART_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Cart>
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch { /* Unit tests use the in-memory store. */ }
  return memoryCarts
}

function writeCartStore(store: Record<string, Cart>): void {
  memoryCarts = store
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(MOCK_CART_STORAGE_KEY, JSON.stringify(store)) } catch { /* Keep the demo usable for this page lifetime. */ }
}

export function resetMockCart(): void {
  memoryCarts = {}
  memoryQuotes = {}
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MOCK_CART_STORAGE_KEY)
      localStorage.removeItem(MOCK_QUOTES_STORAGE_KEY)
    }
  } catch { /* no-op */ }
}

export function getMockCart(scope: string): Cart {
  return cartFor(scope)
}

export function clearMockCart(scope: string): Cart {
  const cart = cartFor(scope)
  return storeCart(scope, { ...emptyCart(), version: cart.version + 1 })
}

function readQuoteStore(): Record<string, Record<string, Quote>> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(MOCK_QUOTES_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, Record<string, Quote>>
  } catch { /* Unit tests use the in-memory store. */ }
  return memoryQuotes
}

export function getIssuedQuote(scope: string, id: string): Quote | undefined {
  return readQuoteStore()[scope]?.[id]
}

function registerQuote(scope: string, quote: Quote): void {
  const store = readQuoteStore()
  store[scope] ??= {}
  store[scope][quote.id] = quote
  memoryQuotes = store
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(MOCK_QUOTES_STORAGE_KEY, JSON.stringify(store)) } catch { /* Keep quote available in memory. */ }
}

function cartError(status: number, code: ApiErrorBody['code'], message: string, details?: Record<string, unknown>): HttpResponse<ApiErrorBody> {
  return HttpResponse.json({ code, message, ...(details ? { details } : {}) } satisfies ApiErrorBody, { status })
}

function getScope(request: Request): string | HttpResponse<ApiErrorBody> {
  if (!request.headers.has('authorization')) return 'guest'
  const session = resolveMockSession(request)
  return session instanceof HttpResponse ? session : `user:${session.user.id}`
}

function cartFor(scope: string, store = readCartStore()): Cart {
  return store[scope] ?? emptyCart()
}

function storeCart(scope: string, cart: Cart, store = readCartStore()): Cart {
  store[scope] = cart
  writeCartStore(store)
  return cart
}

function resolveLine(nftId: string, editionId: string, quantity: number): CartItem | undefined {
  const nft = nftFixtures.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  if (!nft || !edition) return undefined
  const available = getScenario().stockChanged && nftId === 'nft-005' && editionId === 'nft-005-edition-2' ? 1 : edition.available
  return {
    nftId: nft.id,
    editionId: edition.id,
    quantity,
    name: nft.name,
    tokenId: nft.tokenId,
    imageUrl: nft.images[0]?.url ?? '',
    imageAlt: nft.images[0]?.alt ?? nft.name,
    editionLabel: edition.label,
    unitPrice: nft.price,
    available,
  }
}

function delayCart(): Promise<void> {
  const delay = getScenario().latencyCartMs
  return delay > 0 ? new Promise((resolve) => setTimeout(resolve, delay)) : Promise.resolve()
}

function maybeFailCart(): HttpResponse<ApiErrorBody> | undefined {
  return getScenario().failCart ? cartError(503, 'TRANSIENT_FAILURE', 'O serviço de carrinho está temporariamente indisponível.') : undefined
}

function isUpdate(input: unknown): input is UpdateCartItemRequest {
  if (!input || typeof input !== 'object') return false
  const quantity = (input as UpdateCartItemRequest).quantity
  return Number.isSafeInteger(quantity) && quantity >= 1
}

export function createMockQuote(scope: string, input: QuoteRequest, register = true): Quote {
  const cart = cartFor(scope)
  const issues: Quote['issues'] = []
  const lines = cart.items.flatMap((item) => {
    const current = resolveLine(item.nftId, item.editionId, item.quantity)
    if (!current) return []
    if (item.quantity > current.available) issues.push({ type: 'UNAVAILABLE', nftId: item.nftId, editionId: item.editionId, requested: item.quantity, available: current.available })
    if (item.unitPrice !== current.unitPrice) issues.push({ type: 'PRICE_CHANGED', nftId: item.nftId, editionId: item.editionId, previousUnitPrice: item.unitPrice, unitPrice: current.unitPrice })
    return [{ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity, unitPrice: current.unitPrice, lineTotal: mulEthByQuantity(current.unitPrice, item.quantity) }]
  })
  const subtotal = sumEth(lines.map((line) => line.lineTotal))
  const couponCode = input.couponCode?.trim().toUpperCase() || cart.couponCode
  let discount = ZERO_ETH
  if (couponCode && expiredCoupons.has(couponCode)) issues.push({ type: 'COUPON_EXPIRED', code: couponCode })
  else if (couponCode && !validCoupons[couponCode]) issues.push({ type: 'COUPON_INVALID', code: couponCode })
  else if (couponCode && couponCode === 'KURIO10') discount = normalizeEth(parseEth(subtotal).mul('0.10').toFixed())
  const afterDiscount = subEth(subtotal, discount)
  const feeTable: Record<QuoteRequest['network'], string> = { 'ethereum-mainnet': '0.016', polygon: '0.001', arbitrum: '0.002', optimism: '0.002', base: '0.002' }
  const networkFee = lines.length ? normalizeEth(feeTable[input.network]) : ZERO_ETH
  const quote: Quote = {
    id: `quote-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    network: input.network,
    lines,
    subtotal,
    discount,
    networkFee,
    total: addEth(afterDiscount, networkFee),
    couponCode: couponCode && !issues.some((issue) => issue.type === 'COUPON_INVALID' || issue.type === 'COUPON_EXPIRED') ? couponCode : null,
    issues,
    cartVersion: cart.version,
  }
  if (register) registerQuote(scope, quote)
  return quote
}

export const cartHandlers = [
  http.get(`*${API_ROUTES.cart}`, async ({ request }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    const store = readCartStore()
    const cart = cartFor(scope, store)
    const currentLines = cart.items.flatMap((item) => {
      const current = resolveLine(item.nftId, item.editionId, item.quantity)
      return current ? [current] : []
    })
    const currentCart = { ...cart, items: currentLines }
    if (currentLines.length !== cart.items.length || currentLines.some((item, index) => item.available !== cart.items[index]?.available)) storeCart(scope, currentCart, store)
    return HttpResponse.json(currentCart)
  }),

  http.post(`*${API_ROUTES.cartItems}`, async ({ request }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    let input: AddCartItemRequest
    try { input = await request.json() as AddCartItemRequest } catch { return cartError(400, 'VALIDATION_ERROR', 'Informe o NFT, a edição e a quantidade.') }
    if (!input || !input.nftId || !input.editionId || !Number.isSafeInteger(input.quantity) || input.quantity < 1) return cartError(400, 'VALIDATION_ERROR', 'Informe uma quantidade inteira válida.')
    const line = resolveLine(input.nftId, input.editionId, input.quantity)
    if (!line) return cartError(404, 'NOT_FOUND', 'Edição não encontrada.')
    const cart = cartFor(scope)
    const existing = cart.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    const requested = (existing?.quantity ?? 0) + input.quantity
    if (line.available < requested) return cartError(409, 'AVAILABILITY_CONFLICT', 'Quantidade indisponível para esta edição.', { nftId: input.nftId, editionId: input.editionId, requested, available: line.available })
    const item = { ...line, quantity: requested }
    return HttpResponse.json(storeCart(scope, { ...cart, items: existing ? cart.items.map((current) => current.nftId === item.nftId && current.editionId === item.editionId ? item : current) : [...cart.items, item], version: cart.version + 1 }))
  }),

  http.put('*/cart/items/:nftId/:editionId', async ({ request, params }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    let input: UpdateCartItemRequest
    try { input = await request.json() as UpdateCartItemRequest } catch { return cartError(400, 'VALIDATION_ERROR', 'Informe uma quantidade válida.') }
    if (!isUpdate(input)) return cartError(400, 'VALIDATION_ERROR', 'Informe uma quantidade inteira maior que zero.')
    const nftId = String(params.nftId)
    const editionId = String(params.editionId)
    const cart = cartFor(scope)
    const existing = cart.items.find((item) => item.nftId === nftId && item.editionId === editionId)
    if (!existing) return cartError(404, 'NOT_FOUND', 'Este item não está no carrinho.')
    const current = resolveLine(nftId, editionId, input.quantity)
    if (!current) return cartError(404, 'NOT_FOUND', 'Edição não encontrada.')
    if (input.quantity > current.available) return cartError(409, 'AVAILABILITY_CONFLICT', 'A quantidade solicitada excede o estoque disponível.', { nftId, editionId, requested: input.quantity, available: current.available })
    return HttpResponse.json(storeCart(scope, { ...cart, items: cart.items.map((item) => item.nftId === nftId && item.editionId === editionId ? current : item), version: cart.version + 1 }))
  }),

  http.delete('*/cart/items/:nftId/:editionId', async ({ request, params }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    const cart = cartFor(scope)
    const nftId = String(params.nftId)
    const editionId = String(params.editionId)
    if (!cart.items.some((item) => item.nftId === nftId && item.editionId === editionId)) return cartError(404, 'NOT_FOUND', 'Este item não está no carrinho.')
    return HttpResponse.json(storeCart(scope, { ...cart, items: cart.items.filter((item) => item.nftId !== nftId || item.editionId !== editionId), version: cart.version + 1 }))
  }),

  http.post(`*${API_ROUTES.cartCoupon}`, async ({ request }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    let input: ApplyCouponRequest
    try { input = await request.json() as ApplyCouponRequest } catch { return cartError(400, 'VALIDATION_ERROR', 'Informe o código do cupom.') }
    const code = input.code?.trim().toUpperCase()
    if (!code) return cartError(400, 'VALIDATION_ERROR', 'Informe o código do cupom.')
    if (expiredCoupons.has(code)) return cartError(410, 'COUPON_EXPIRED', 'Este cupom expirou.')
    if (!validCoupons[code]) return cartError(422, 'COUPON_INVALID', 'Cupom inválido. Confira o código e tente novamente.')
    const cart = cartFor(scope)
    return HttpResponse.json(storeCart(scope, { ...cart, couponCode: code, version: cart.version + 1 }))
  }),

  http.delete(`*${API_ROUTES.cartCoupon}`, async ({ request }) => {
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    const cart = cartFor(scope)
    return HttpResponse.json(storeCart(scope, { ...cart, couponCode: null, version: cart.version + 1 }))
  }),

  http.post(`*${API_ROUTES.cartMerge}`, async ({ request }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const session = resolveMockSession(request)
    if (session instanceof HttpResponse) return session
    const store = readCartStore()
    const guest = cartFor('guest', store)
    const userScope = `user:${session.user.id}`
    const userCart = cartFor(userScope, store)
    const merged = [...userCart.items]
    for (const guestItem of guest.items) {
      const latest = resolveLine(guestItem.nftId, guestItem.editionId, 1)
      if (!latest || latest.available < 1) continue
      const index = merged.findIndex((item) => item.nftId === guestItem.nftId && item.editionId === guestItem.editionId)
      const quantity = Math.min(latest.available, (index >= 0 ? merged[index]!.quantity : 0) + guestItem.quantity)
      const line = { ...latest, quantity }
      if (index >= 0) merged[index] = line
      else merged.push(line)
    }
    const result = { ...userCart, items: merged, couponCode: userCart.couponCode ?? guest.couponCode, version: userCart.version + (guest.items.length || guest.couponCode ? 1 : 0) }
    store[userScope] = result
    store.guest = emptyCart()
    writeCartStore(store)
    return HttpResponse.json(result)
  }),

  http.post(`*${API_ROUTES.quotes}`, async ({ request }) => {
    await delayCart()
    const failure = maybeFailCart()
    if (failure) return failure
    const scope = getScope(request)
    if (scope instanceof HttpResponse) return scope
    let input: QuoteRequest
    try { input = await request.json() as QuoteRequest } catch { return cartError(400, 'VALIDATION_ERROR', 'Informe a rede para calcular a cotação.') }
    const allowedNetworks: QuoteRequest['network'][] = ['ethereum-mainnet', 'polygon', 'arbitrum', 'optimism', 'base']
    if (!input || !allowedNetworks.includes(input.network)) return cartError(400, 'VALIDATION_ERROR', 'Selecione uma rede válida.')
    const quote = createMockQuote(scope, input)
    return HttpResponse.json(quote)
  }),
]
