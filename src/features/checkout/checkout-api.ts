import type { CreateOrderRequest, Order, Wallet, WalletInput, WalletsResponse } from '@/shared/api/contracts'
import { API_ROUTES, IDEMPOTENCY_HEADER } from '@/shared/api/contracts'
import { getSessionToken } from '@/features/auth/session'
import { http } from '@/shared/api/http'

function config() {
  const token = getSessionToken()
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
}

export async function getWallets(): Promise<Wallet[]> {
  const response = await http.get<WalletsResponse>(API_ROUTES.wallets, config())
  return response.data.items
}
export async function addDemoWallet(input: WalletInput): Promise<Wallet> {
  const response = await http.post<Wallet>(API_ROUTES.wallets, input, config())
  return response.data
}
export async function createOrder(input: CreateOrderRequest, idempotencyKey: string): Promise<Order> {
  const response = await http.post<Order>(API_ROUTES.orders, input, { ...config(), headers: { ...config()?.headers, [IDEMPOTENCY_HEADER]: idempotencyKey } })
  return response.data
}
export async function getOrder(id: string): Promise<Order> {
  const response = await http.get<Order>(API_ROUTES.order(id), config())
  return response.data
}
