import { getResponse, http, passthrough, type HttpHandler } from 'msw'
import {assetHandlers} from './assets'
import {realtimeHandler} from '../realtime'
import { authHandlers } from './auth'
// Public files have real Vite responses. Avoid testing every REST route for each
// code/font/image request; API paths, generated SVG artwork and sockets stay mocked.
const staticFiles = http.get(/\/(?:assets\/[^?#]+\.(?:js|css)|fonts\/[^?#]+\.(?:woff2|ttf|css)|nft-art\/[^?#]+\.(?:png|webp))(?:\?.*)?$/, () => passthrough())
function route(pattern: RegExp, load: () => Promise<HttpHandler[]>) {
  return http.all(pattern, async ({ request }) =>
    await getResponse(await load(), request) ?? passthrough())
}

// Import each REST feature on its first request, keeping the original handlers,
// shared module state, validation and persistence. No API response is fabricated here.
export const handlers = [
  staticFiles,
  ...authHandlers,
  route(/\/nfts(?:\/[^/]+)?$/, async () => (await import('./nfts')).nftHandlers),
  route(/\/favorites(?:\/[^/]+)?$/, async () => (await import('./favorites')).favoriteHandlers),
  route(/\/(?:cart(?:\/.*)?|quotes)$/, async () => (await import('./cart')).cartHandlers),
  route(/\/profile(?:\/.*)?$/, async () => {
    const [profile, extra] = await Promise.all([import('./profile'), import('./profile-extra')])
    return [...profile.profileHandlers, ...extra.profileExtraHandlers]
  }),
  route(/\/(?:wallets|orders)(?:\/.*)?$/, async () => {
    const [wallets, orders, account] = await Promise.all([import('./wallets'), import('./orders'), import('./account-data')])
    return [...wallets.walletHandlers, ...account.accountDataHandlers, ...orders.orderHandlers]
  }),
  ...assetHandlers,
  realtimeHandler,
]
