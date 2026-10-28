import { describe, expect, it } from 'vitest'
import { parseNftListQuery, serializeNftListQuery } from './nft-query'

describe('NFT catalog query codec', () => {
  it('round trips repeated arrays, decimal strings and pagination deterministically', () => {
    const parsed = parseNftListQuery(new URLSearchParams('q=blue%20bird&collection=Fotografia&collection=Arte%20digital&network=polygon&network=ethereum-mainnet&minPrice=0.02&maxPrice=12.30&page=2&pageSize=6'))
    expect(parsed).toMatchObject({ q: 'blue bird', collections: ['Arte digital', 'Fotografia'], networks: ['ethereum-mainnet', 'polygon'], minPrice: '0.02', maxPrice: '12.30', page: 2, pageSize: 6 })
    expect(serializeNftListQuery(parsed)).toBe('q=blue+bird&collection=Arte+digital&collection=Fotografia&minPrice=0.02&maxPrice=12.30&network=ethereum-mainnet&network=polygon&page=2&pageSize=6')
  })

  it('normalizes invalid values and removes duplicates', () => {
    expect(parseNftListQuery(new URLSearchParams('page=0&pageSize=999&sort=nope&minPrice=1e3&collection=%20&collection=Jogos&collection=Jogos&network=unknown')))
      .toEqual({ collections: ['Jogos'], page: 1, pageSize: 12 })
  })
})
