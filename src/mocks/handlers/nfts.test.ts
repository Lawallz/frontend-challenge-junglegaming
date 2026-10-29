import { describe, expect, it } from 'vitest'
import { parseNftListQuery } from '@/shared/api/contracts'
import { nftFixtures } from '../fixtures/nfts'
import { filterSortNfts } from './catalog-query'

describe('catalog fixture queries', () => {
  it('combines category, network and exact decimal price filters', () => {
    const query = parseNftListQuery(new URLSearchParams('collection=Arte%20digital&network=ethereum-mainnet&minPrice=0.02&maxPrice=0.02'))
    expect(filterSortNfts(nftFixtures, query).map((nft) => nft.id)).toEqual(['nft-001'])
  })

  it('returns stable price ordering and empty results', () => {
    expect(filterSortNfts(nftFixtures, { sort: 'price_asc' }).slice(0, 2).map((nft) => nft.id)).toEqual(['nft-001', 'nft-014'])
    expect(filterSortNfts(nftFixtures, { q: 'not present' })).toEqual([])
  })

  it('sorts canonical timestamps descending with stable ID tie breaking', () => {
    const first = nftFixtures[0]!
    const second = { ...nftFixtures[1]!, createdAt: first.createdAt }
    expect(filterSortNfts([second, nftFixtures[2]!, first], { sort: 'recent' }).map(nft => nft.id))
      .toEqual([first.id, second.id, nftFixtures[2]!.id])
  })
})
