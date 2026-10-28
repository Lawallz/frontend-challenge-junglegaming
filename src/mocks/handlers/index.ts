import type { RequestHandler } from 'msw'

/**
 * Handlers REST e Socket.IO. Cada recurso entra em sua própria etapa
 * (ex.: ./nfts.ts, ./auth.ts) e é agregado aqui.
 */
import { assetHandlers } from './assets'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'

export const handlers: RequestHandler[] = [...authHandlers, ...favoriteHandlers, ...nftHandlers, ...cartHandlers, ...assetHandlers]
