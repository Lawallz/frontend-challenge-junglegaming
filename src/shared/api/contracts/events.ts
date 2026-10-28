import type { EthAmount, IsoDateString } from './common'
import type { NftEdition } from './nft'
import type { OrderStatus } from './orders'

/**
 * Envelope comum. Regras do cliente:
 * - `eventId` repetido → descartar (duplicata);
 * - `version` <= versão já aplicada do recurso → descartar (evento antigo);
 * - `audienceUserId` presente e diferente da sessão atual → descartar.
 */
export interface EventEnvelope<TType extends string, TResource extends string, TPayload> {
  eventId: string
  type: TType
  resource: { type: TResource; id: string }
  version: number
  occurredAt: IsoDateString
  /** Eventos privados (pedidos) carregam o dono; públicos (NFT) usam null. */
  audienceUserId: string | null
  payload: TPayload
}

export interface NftUpdatedPayload {
  nftId: string
  price: EthAmount
  editions: Array<Pick<NftEdition, 'id' | 'available'>>
}

export interface OrderUpdatedPayload {
  orderId: string
  status: OrderStatus
  transactionRef: string | null
  declineReason: string | null
}

export type NftUpdatedEvent = EventEnvelope<'nft.updated', 'nft', NftUpdatedPayload>
export type OrderUpdatedEvent = EventEnvelope<'order.updated', 'order', OrderUpdatedPayload>

export type SubscriptionTarget = { type: 'nft'; id: string } | { type: 'order'; id: string }

/** Tipagem para `Socket<ServerToClientEvents, ClientToServerEvents>` do socket.io-client. */
export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

export interface ClientToServerEvents {
  subscribe: (target: SubscriptionTarget) => void
  unsubscribe: (target: SubscriptionTarget) => void
}

/** Handshake: `auth: { token }`. Sem token só chegam eventos públicos. */
export interface SocketHandshakeAuth {
  token?: string
}
