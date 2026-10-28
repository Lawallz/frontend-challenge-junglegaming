import type { EthAmount, EthNetwork, IsoDateString, Paginated } from './common'

export type NftNetwork = EthNetwork | 'solana'

export interface NftImage {
  id: string
  url: string
  /** Texto alternativo obrigatório (acessibilidade). */
  alt: string
}

export interface NftEdition {
  id: string
  /** Rótulo exibido: "1/1", "1/10", "1/50". */
  label: string
  supply: number
  /** Unidades ainda compráveis desta edição. */
  available: number
}

export type NftRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Nft {
  id: string
  /** Ex.: "#0042". */
  tokenId: string
  name: string
  collection: { id: string; name: string }
  description: string
  price: EthAmount
  /** Preço anterior, exibido riscado quando existir. */
  previousPrice: EthAmount | null
  images: NftImage[]
  editions: NftEdition[]
  attributes: string[]
  rarity: NftRarity | null
  rating: { average: number; count: number }
  /** Percentual de royalties como string decimal, ex.: "5". */
  royaltyPercent: string
  chain: {
    network: NftNetwork
    contractAddress: string
    standard: 'ERC-721'
    metadataStorage: 'ipfs'
  }
  createdAt: IsoDateString
  /** Sobe a cada mudança de preço/disponibilidade; base da ordenação de eventos. */
  version: number
}

export type NftSort = 'recent' | 'price_asc' | 'price_desc' | 'name'
export type NftTab = 'all' | 'new' | 'trending'

/**
 * Parâmetros de GET /nfts. Arrays têm representação repetida e ordenação estável
 * na URL; ver nft-query.ts.
 */
export interface NftListQuery {
  q?: string
  tab?: NftTab
  collections?: string[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  networks?: NftNetwork[]
  sort?: NftSort
  page?: number
  pageSize?: number
}

export type NftListResponse = Paginated<Nft>
export type NftDetailResponse = Nft
