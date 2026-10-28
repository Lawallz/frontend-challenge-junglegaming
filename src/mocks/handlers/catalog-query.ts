import { compareEth } from '@/shared/lib/eth'
import type { Nft, NftListQuery } from '@/shared/api/contracts'
import { nftFixtureMetadata } from '../fixtures/nfts'

export function filterSortNfts(items: readonly Nft[], query: NftListQuery): Nft[] {
  let result = items.filter((nft) => {
    const search = query.q?.toLocaleLowerCase()
    const metadata = nftFixtureMetadata.get(nft.id)
    if (search && ![nft.name, nft.collection.name, nft.description].some((part) => part.toLocaleLowerCase().includes(search))) return false
    if (query.collections?.length && !query.collections.includes(metadata?.category ?? nft.collection.name)) return false
    if (query.minPrice && compareEth(nft.price, query.minPrice) < 0) return false
    if (query.maxPrice && compareEth(nft.price, query.maxPrice) > 0) return false
    if (query.networks?.length && !query.networks.includes(nft.chain.network)) return false
    if (query.tab === 'new' && metadata && Date.parse(nft.createdAt) < Date.parse('2026-10-13T00:00:00.000Z')) return false
    return true
  })
  if (query.sort === 'price_asc') result = result.sort((a, b) => compareEth(a.price, b.price) || a.id.localeCompare(b.id))
  else if (query.sort === 'price_desc') result = result.sort((a, b) => compareEth(b.price, a.price) || a.id.localeCompare(b.id))
  else if (query.sort === 'name') result = result.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  else if (query.tab === 'trending') result = result.sort((a, b) => (nftFixtureMetadata.get(b.id)?.popularity ?? 0) - (nftFixtureMetadata.get(a.id)?.popularity ?? 0) || a.id.localeCompare(b.id))
  else result = result.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  return result
}
