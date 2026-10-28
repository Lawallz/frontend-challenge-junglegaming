import { isEthString } from '@/shared/lib/eth'
import type { NftListQuery, NftNetwork, NftSort, NftTab } from './nft'

const networks: NftNetwork[] = ['ethereum-mainnet', 'polygon', 'solana', 'arbitrum', 'optimism', 'base']
const sorts: NftSort[] = ['recent', 'price_asc', 'price_desc', 'name']
const tabs: NftTab[] = ['all', 'new', 'trending']
const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 100

function validInteger(value: string | null, fallback: number, min: number, max: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

/** Parse catalog params. Invalid enum/ETH values are omitted; invalid pagination uses defaults. */
export function parseNftListQuery(params: URLSearchParams): NftListQuery {
  const q = params.get('q')?.trim()
  const tabValue = params.get('tab')
  const sortValue = params.get('sort')
  const minPrice = params.get('minPrice')
  const maxPrice = params.get('maxPrice')
  const collections = [...new Set(params.getAll('collection').map((x) => x.trim()).filter(Boolean))].sort()
  const selectedNetworks = [...new Set(params.getAll('network').filter((x): x is NftNetwork => networks.includes(x as NftNetwork)))].sort()
  const query: NftListQuery = {
    page: validInteger(params.get('page'), 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: validInteger(params.get('pageSize'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
  }
  if (q) query.q = q
  if (tabValue && tabs.includes(tabValue as NftTab)) query.tab = tabValue as NftTab
  if (collections.length) query.collections = collections
  if (minPrice && isEthString(minPrice)) query.minPrice = minPrice
  if (maxPrice && isEthString(maxPrice)) query.maxPrice = maxPrice
  if (selectedNetworks.length) query.networks = selectedNetworks
  if (sortValue && sorts.includes(sortValue as NftSort)) query.sort = sortValue as NftSort
  return query
}

/** Stable query representation: fixed key order and sorted, repeated array values. */
export function serializeNftListQuery(query: NftListQuery): string {
  const params = new URLSearchParams()
  if (query.q?.trim()) params.set('q', query.q.trim())
  if (query.tab) params.set('tab', query.tab)
  for (const value of [...new Set(query.collections ?? [])].sort()) params.append('collection', value)
  if (query.minPrice !== undefined) params.set('minPrice', query.minPrice)
  if (query.maxPrice !== undefined) params.set('maxPrice', query.maxPrice)
  for (const value of [...new Set(query.networks ?? [])].sort()) params.append('network', value)
  if (query.sort) params.set('sort', query.sort)
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize))
  return params.toString()
}
