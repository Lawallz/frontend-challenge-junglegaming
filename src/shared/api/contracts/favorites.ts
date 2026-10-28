import type { IsoDateString } from './common'

export interface Favorite {
  nftId: string
  createdAt: IsoDateString
}

export interface FavoritesResponse {
  items: Favorite[]
}
