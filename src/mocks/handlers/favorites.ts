import { http, HttpResponse } from 'msw'
import type { ApiErrorBody, Favorite, FavoritesResponse } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { nftFixtures } from '../fixtures/nfts'
import { readMockAuthState, resolveMockSession, writeMockAuthState } from './auth'

function errorResponse(status: number, code: ApiErrorBody['code'], message: string): HttpResponse<ApiErrorBody> {
  return HttpResponse.json({ code, message } satisfies ApiErrorBody, { status })
}

export const favoriteHandlers = [
  http.get(`*${API_ROUTES.favorites}`, ({ request }) => {
    const state = readMockAuthState()
    const session = resolveMockSession(request, state)
    if (session instanceof HttpResponse) return session
    return HttpResponse.json({ items: state.favorites[session.user.id] ?? [] } satisfies FavoritesResponse)
  }),
  http.post(`*${API_ROUTES.favorites}/:nftId`, ({ request, params }) => {
    const state = readMockAuthState()
    const session = resolveMockSession(request, state)
    if (session instanceof HttpResponse) return session
    const nftId = String(params.nftId)
    if (!nftFixtures.some((nft) => nft.id === nftId)) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    const favorites = state.favorites[session.user.id] ?? []
    const existing = favorites.find((favorite) => favorite.nftId === nftId)
    const favorite: Favorite = existing ?? { nftId, createdAt: new Date().toISOString() }
    if (!existing) state.favorites[session.user.id] = [...favorites, favorite]
    writeMockAuthState(state)
    return HttpResponse.json(favorite, { status: existing ? 200 : 201 })
  }),
  http.delete(`*${API_ROUTES.favorites}/:nftId`, ({ request, params }) => {
    const state = readMockAuthState()
    const session = resolveMockSession(request, state)
    if (session instanceof HttpResponse) return session
    const nftId = String(params.nftId)
    state.favorites[session.user.id] = (state.favorites[session.user.id] ?? []).filter((favorite) => favorite.nftId !== nftId)
    writeMockAuthState(state)
    return new HttpResponse(null, { status: 204 })
  }),
]
