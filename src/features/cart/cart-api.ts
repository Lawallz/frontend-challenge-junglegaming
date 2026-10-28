import type { AddCartItemRequest, ApplyCouponRequest, Cart, Quote, QuoteRequest, UpdateCartItemRequest } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { http } from '@/shared/api/http'
import { getSessionToken } from '@/features/auth/session'

const cartConfig = () => {
  const token = getSessionToken()
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
}

export const cartQueryKey = (userId?: string | null) => ['cart', userId ?? 'guest'] as const

export async function getCart(): Promise<Cart> {
  const response = await http.get<Cart>(API_ROUTES.cart, cartConfig())
  return response.data
}

export async function addCartItem(item: AddCartItemRequest): Promise<Cart> {
  const response = await http.post<Cart>(API_ROUTES.cartItems, item, cartConfig())
  return response.data
}

export async function updateCartItem(nftId: string, editionId: string, input: UpdateCartItemRequest): Promise<Cart> {
  const response = await http.put<Cart>(API_ROUTES.cartItem(nftId, editionId), input, cartConfig())
  return response.data
}

export async function removeCartItem(nftId: string, editionId: string): Promise<Cart> {
  const response = await http.delete<Cart>(API_ROUTES.cartItem(nftId, editionId), cartConfig())
  return response.data
}

export async function applyCartCoupon(input: ApplyCouponRequest): Promise<Cart> {
  const response = await http.post<Cart>(API_ROUTES.cartCoupon, input, cartConfig())
  return response.data
}

export async function removeCartCoupon(): Promise<Cart> {
  const response = await http.delete<Cart>(API_ROUTES.cartCoupon, cartConfig())
  return response.data
}

export async function mergeGuestCart(): Promise<Cart> {
  const response = await http.post<Cart>(API_ROUTES.cartMerge, undefined, cartConfig())
  return response.data
}

export async function getQuote(input: QuoteRequest): Promise<Quote> {
  const response = await http.post<Quote>(API_ROUTES.quotes, input, cartConfig())
  return response.data
}
