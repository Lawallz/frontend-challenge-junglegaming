import type { Favorite, FavoritesResponse } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { http } from '@/shared/api/http'
import { getSessionToken } from '@/features/auth/session'

function authConfig() {
  const token = getSessionToken()
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
}

export async function getFavorites(): Promise<Favorite[]> {
  return (await http.get<FavoritesResponse>(API_ROUTES.favorites, authConfig())).data.items
}

export async function addFavorite(nftId: string): Promise<Favorite> {
  return (await http.post<Favorite>(API_ROUTES.favorite(nftId), undefined, authConfig())).data
}

export async function removeFavorite(nftId: string): Promise<void> {
  await http.delete(API_ROUTES.favorite(nftId), authConfig())
}
