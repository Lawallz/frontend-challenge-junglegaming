import type { EthNetwork } from './common'

export type WalletRole = 'primary' | 'secondary'
export type WalletType = 'metamask' | 'walletconnect' | 'coinbase'
export type WalletConnectionStatus = 'connected' | 'disconnected'

export interface Wallet {
  id: string
  role: WalletRole
  /** Nome de exibição. */
  label: string
  alias: string | null
  address: string
  ensName: string | null
  network: EthNetwork
  walletType: WalletType
  connection: WalletConnectionStatus
}

export interface WalletInput {
  role: WalletRole
  label: string
  alias?: string | null
  address: string
  ensName?: string | null
  network: EthNetwork
  walletType: WalletType
}

export type WalletUpdateInput = Partial<Omit<WalletInput, 'role'>>

export interface WalletsResponse {
  items: Wallet[]
}

/** POST /wallets/:id/connection. A recusa responde 403 WALLET_CONNECTION_REFUSED. */
export interface WalletConnectionRequest {
  action: 'connect' | 'disconnect'
}
