import { http, HttpResponse } from 'msw'
import type { AddCartItemRequest, ApiErrorBody, Cart, CartItem } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { nftFixtures } from '../fixtures/nfts'

const emptyCart = (): Cart => ({ items: [], couponCode: null, version: 0 })
let cart = emptyCart()

export function resetMockCart(): void {
  cart = emptyCart()
}

function cartError(status: number, code: ApiErrorBody['code'], message: string, details?: Record<string, unknown>) {
  return HttpResponse.json({ code, message, ...(details ? { details } : {}) } satisfies ApiErrorBody, { status })
}

export const cartHandlers = [
  http.get(`*${API_ROUTES.cart}`, () => HttpResponse.json(cart)),
  http.post(`*${API_ROUTES.cartItems}`, async ({ request }) => {
    let input: AddCartItemRequest
    try {
      input = await request.json() as AddCartItemRequest
    } catch {
      return cartError(400, 'VALIDATION_ERROR', 'Informe o NFT, a edição e a quantidade.')
    }

    if (!input.nftId || !input.editionId || !Number.isSafeInteger(input.quantity) || input.quantity < 1) {
      return cartError(400, 'VALIDATION_ERROR', 'Informe uma quantidade inteira válida.')
    }

    const nft = nftFixtures.find((item) => item.id === input.nftId)
    const edition = nft?.editions.find((item) => item.id === input.editionId)
    if (!nft || !edition) return cartError(404, 'NOT_FOUND', 'Edição não encontrada.')

    const existing = cart.items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
    const requested = (existing?.quantity ?? 0) + input.quantity
    if (edition.available < requested) {
      return cartError(409, 'AVAILABILITY_CONFLICT', 'Quantidade indisponível para esta edição.', {
        nftId: input.nftId,
        editionId: input.editionId,
        requested,
        available: edition.available,
      })
    }

    const line: CartItem = {
      nftId: nft.id,
      editionId: edition.id,
      quantity: input.quantity,
      name: nft.name,
      tokenId: nft.tokenId,
      imageUrl: nft.images[0]?.url ?? '',
      imageAlt: nft.images[0]?.alt ?? nft.name,
      editionLabel: edition.label,
      unitPrice: nft.price,
      available: edition.available,
    }
    cart = {
      ...cart,
      items: existing
        ? cart.items.map((item) => item === existing ? { ...item, quantity: requested } : item)
        : [...cart.items, line],
      version: cart.version + 1,
    }
    return HttpResponse.json(cart)
  }),
]
