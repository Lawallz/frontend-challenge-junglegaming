import type { EthAmount } from './common'

/** Linha de carrinho: identidade = (nftId, editionId). */
export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
  /** Dados de exibição vindos da API; o preço oficial é o da cotação. */
  name: string
  tokenId: string
  imageUrl: string
  imageAlt: string
  editionLabel: string
  unitPrice: EthAmount
  available: number
}

export interface Cart {
  items: CartItem[]
  couponCode: string | null
  /** Incrementa a cada mutação do carrinho. */
  version: number
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface ApplyCouponRequest {
  code: string
}
