import type { AddCartItemRequest, Cart } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { http } from '@/shared/api/http'

export async function getCart(): Promise<Cart> {
  const response = await http.get<Cart>(API_ROUTES.cart)
  return response.data
}

export async function addCartItem(item: AddCartItemRequest): Promise<Cart> {
  const response = await http.post<Cart>(API_ROUTES.cartItems, item)
  return response.data
}
