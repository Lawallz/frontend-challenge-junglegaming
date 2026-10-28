import type { EthAmount, EthNetwork, IsoDateString, Paginated } from './common'
import type { Wallet } from './wallets'

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

/** Estados terminais não mudam mais. */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ['confirmed', 'declined']

export interface CreateOrderRequest {
  /** Cotação que o usuário revisou e aceitou. */
  quoteId: string
  /** Total aceito: se divergir da cotação vigente, a API responde 409 PRICE_CHANGED. */
  acceptedTotal: EthAmount
  walletId: string
  network: EthNetwork
  buyer: { displayName: string; email: string }
}

export interface OrderSnapshotLine {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  editionLabel: string
  imageUrl: string
  imageAlt: string
  unitPrice: EthAmount
  quantity: number
  lineTotal: EthAmount
}

/** Cópia imutável gravada na criação do pedido; é a fonte do recibo. */
export interface OrderSnapshot {
  lines: OrderSnapshotLine[]
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  couponCode: string | null
  network: EthNetwork
  wallet: Pick<Wallet, 'id' | 'label' | 'address' | 'walletType' | 'network'>
}

export interface Order {
  id: string
  status: OrderStatus
  /** Sobe a cada transição; base da ordenação de eventos. */
  version: number
  createdAt: IsoDateString
  updatedAt: IsoDateString
  /** Referência simulada; null enquanto pendente ou recusado. */
  transactionRef: string | null
  declineReason: string | null
  snapshot: OrderSnapshot
}

/**
 * Cabeçalho `Idempotency-Key` obrigatório em POST /orders:
 * mesma chave + mesmo corpo → mesmo pedido (200/201);
 * mesma chave + corpo diferente → 409 IDEMPOTENCY_KEY_REUSED.
 */
export type CreateOrderResponse = Order
export type OrderResponse = Order
export type OrdersListResponse = Paginated<Order>
