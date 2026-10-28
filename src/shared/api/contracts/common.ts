import type { EthAmount } from '@/shared/lib/eth'

export type { EthAmount }

/** Instante em ISO 8601 (UTC), ex.: "2026-07-29T14:03:00.000Z". */
export type IsoDateString = string

/** Cabeçalho obrigatório em POST /orders. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

export type EthNetwork = 'ethereum-mainnet' | 'polygon' | 'arbitrum' | 'optimism' | 'base'

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Códigos de erro do contrato REST.
 * Os três últimos são gerados só no cliente (sem resposta HTTP).
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'AVAILABILITY_CONFLICT'
  | 'PRICE_CHANGED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'WALLET_CONNECTION_REFUSED'
  | 'TRANSIENT_FAILURE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

/** Corpo de toda resposta 4xx/5xx. */
export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Campo → mensagem. Presente em VALIDATION_ERROR e CONFLICT de formulário. */
  fieldErrors?: Record<string, string>
  /** Contexto extra (ex.: itens indisponíveis, cotação atual). */
  details?: Record<string, unknown>
}
