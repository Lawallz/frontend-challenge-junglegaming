import type { EthAmount, EthNetwork, IsoDateString } from './common'

export interface QuoteLine {
  nftId: string
  editionId: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

export type QuoteIssue =
  | { type: 'PRICE_CHANGED'; nftId: string; editionId: string; previousUnitPrice: EthAmount; unitPrice: EthAmount }
  | { type: 'UNAVAILABLE'; nftId: string; editionId: string; requested: number; available: number }
  | { type: 'COUPON_INVALID'; code: string }
  | { type: 'COUPON_EXPIRED'; code: string }

export interface Quote {
  id: string
  createdAt: IsoDateString
  /** Depois disso a cotação não pode mais ser aceita. */
  expiresAt: IsoDateString
  network: EthNetwork
  lines: QuoteLine[]
  subtotal: EthAmount
  /** Valor positivo a subtrair do subtotal. */
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  couponCode: string | null
  /** Vazio = cotação confirmável. */
  issues: QuoteIssue[]
  /** Versão do carrinho usada na cotação. */
  cartVersion: number
}

/** POST /quotes. A API é a referência para finalizar o pedido. */
export interface QuoteRequest {
  network: EthNetwork
  couponCode?: string | null
}
