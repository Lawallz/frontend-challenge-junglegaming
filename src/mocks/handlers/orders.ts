import { http, HttpResponse } from 'msw'
import type { ApiErrorBody, CartItem, CreateOrderRequest, Order, OrderSnapshotLine, Quote } from '@/shared/api/contracts'
import { API_ROUTES, IDEMPOTENCY_HEADER } from '@/shared/api/contracts'
import { eqEth } from '@/shared/lib/eth'
import { getScenario } from '../scenarios'
import { clearMockCart, createMockQuote, getIssuedQuote, getMockCart } from './cart'
import { resolveMockSession } from './auth'
import { getMockWallets } from './wallets'

export const MOCK_ORDERS_STORAGE_KEY = 'kurio:mock:orders:v1'
interface IdempotentResult { fingerprint: string; order: Order }
interface OrderStore { orders: Record<string, Order>; idempotency: Record<string, IdempotentResult> }
const emptyStore = (): OrderStore => ({ orders: {}, idempotency: {} })
let memoryStore = emptyStore()

function readStore(): OrderStore {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(MOCK_ORDERS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as OrderStore
  } catch { /* Unit tests use memory storage. */ }
  return memoryStore
}
function writeStore(store: OrderStore): void {
  memoryStore = store
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(MOCK_ORDERS_STORAGE_KEY, JSON.stringify(store)) } catch { /* Keep the demo usable for this page lifetime. */ }
}
export function resetMockOrders(): void {
  memoryStore = emptyStore()
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(MOCK_ORDERS_STORAGE_KEY) } catch { /* no-op */ }
}
function error(status: number, code: ApiErrorBody['code'], message: string, details?: Record<string, unknown>) {
  return HttpResponse.json({ code, message, ...(details ? { details } : {}) } satisfies ApiErrorBody, { status })
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}
function quoteMatches(accepted: Quote, current: Quote): boolean {
  return accepted.cartVersion === current.cartVersion && accepted.network === current.network && accepted.couponCode === current.couponCode &&
    eqEth(accepted.subtotal, current.subtotal) && eqEth(accepted.discount, current.discount) && eqEth(accepted.networkFee, current.networkFee) && eqEth(accepted.total, current.total) &&
    canonical(accepted.lines) === canonical(current.lines) && current.issues.length === 0
}
function snapshotLines(items: CartItem[], quote: Quote): OrderSnapshotLine[] {
  return quote.lines.map((line) => {
    const item = items.find((candidate) => candidate.nftId === line.nftId && candidate.editionId === line.editionId)!
    return { ...line, name: item.name, tokenId: item.tokenId, editionLabel: item.editionLabel, imageUrl: item.imageUrl, imageAlt: item.imageAlt }
  })
}

export const orderHandlers = [
  http.post(`*${API_ROUTES.orders}`, async ({ request }) => {
    const scenario = getScenario()
    if (scenario.latencyOrdersMs > 0) await new Promise((resolve) => setTimeout(resolve, scenario.latencyOrdersMs))
    if (scenario.failOrders) return error(503, 'TRANSIENT_FAILURE', 'NÃ£o foi possÃ­vel confirmar o pedido agora. Tente novamente.')
    const session = resolveMockSession(request)
    if (session instanceof HttpResponse) return session
    const key = request.headers.get(IDEMPOTENCY_HEADER)?.trim()
    if (!key) return error(400, 'VALIDATION_ERROR', 'A chave de idempotÃªncia Ã© obrigatÃ³ria.')
    let input: CreateOrderRequest
    try { input = await request.json() as CreateOrderRequest } catch { return error(400, 'VALIDATION_ERROR', 'Confira os dados do pedido.') }
    if (!input?.quoteId || !input.walletId || !input.network || !input.acceptedTotal || !input.buyer?.email || !input.buyer?.displayName) return error(400, 'VALIDATION_ERROR', 'Confira os dados do pedido.')
    const fingerprint = canonical(input)
    const store = readStore()
    const idempotencyKey = `${session.user.id}:${key}`
    const previous = store.idempotency[idempotencyKey]
    if (previous) return previous.fingerprint === fingerprint ? HttpResponse.json(previous.order) : error(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave jÃ¡ foi usada com outro conteÃºdo.')

    const wallet = getMockWallets(session.user.id).find((item) => item.id === input.walletId)
    if (!wallet) return error(404, 'NOT_FOUND', 'A carteira selecionada nÃ£o foi encontrada.')
    if (wallet.network !== input.network) return error(409, 'CONFLICT', 'A carteira selecionada pertence a outra rede.')
    const cart = getMockCart(`user:${session.user.id}`)
    if (!cart.items.length) return error(409, 'AVAILABILITY_CONFLICT', 'Seu carrinho estÃ¡ vazio.')
    const accepted = getIssuedQuote(`user:${session.user.id}`, input.quoteId)
    if (!accepted || Date.parse(accepted.expiresAt) <= Date.now()) return error(409, 'PRICE_CHANGED', 'A cotaÃ§Ã£o expirou. Atualize os valores e tente novamente.')
    if (accepted.network !== input.network || !eqEth(accepted.total, input.acceptedTotal)) return error(409, 'PRICE_CHANGED', 'Os valores aceitos nÃ£o correspondem Ã  cotaÃ§Ã£o.')

    const current = createMockQuote(`user:${session.user.id}`, { network: input.network, couponCode: cart.couponCode }, false)
    if (current.issues.some((issue) => issue.type === 'UNAVAILABLE')) return error(409, 'AVAILABILITY_CONFLICT', 'O estoque mudou. Revise a quantidade disponÃ­vel.', { quote: current })
    if (!quoteMatches(accepted, current)) return error(409, 'PRICE_CHANGED', 'Os preÃ§os ou descontos mudaram. Revise a cotaÃ§Ã£o.', { quote: current })

    const now = new Date().toISOString()
    const order: Order = {
      id: `order-${crypto.randomUUID()}`,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
      transactionRef: null,
      declineReason: null,
      snapshot: {
        lines: snapshotLines(cart.items, current),
        subtotal: current.subtotal,
        discount: current.discount,
        networkFee: current.networkFee,
        total: current.total,
        couponCode: current.couponCode,
        network: current.network,
        wallet: { id: wallet.id, label: wallet.label, address: wallet.address, walletType: wallet.walletType, network: wallet.network },
      },
    }
    store.orders[`${session.user.id}:${order.id}`] = order
    store.idempotency[idempotencyKey] = { fingerprint, order }
    writeStore(store)
    clearMockCart(`user:${session.user.id}`)
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('*/orders/:orderId', ({ request, params }) => {
    const session = resolveMockSession(request)
    if (session instanceof HttpResponse) return session
    const order = readStore().orders[`${session.user.id}:${String(params.orderId)}`]
    return order ? HttpResponse.json(order) : error(404, 'NOT_FOUND', 'NÃ£o encontramos este pedido.')
  }),
]
export function listMockOrders(userId:string){return Object.entries(readStore().orders).filter(([key])=>key.startsWith(userId+':')).map(([,order])=>order).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))}
export function updateMockOrderStatus(userId:string,orderId:string,status:Order['status'],reason:string|null=null):Order|null{const store=readStore(),key=`${userId}:${orderId}`,order=store.orders[key];if(!order||order.status!=='pending')return order??null;const updated:Order={...order,status,version:order.version+1,updatedAt:new Date().toISOString(),transactionRef:status==='confirmed'?`demo-tx-${orderId}`:null,declineReason:status==='declined'?reason:null};store.orders[key]=updated;writeStore(store);return updated}