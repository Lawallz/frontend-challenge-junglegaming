/** Caminhos relativos a `VITE_API_BASE_URL` (padrão `/api`). Fonte única para Axios e MSW. */
export const API_ROUTES = {
  register: '/auth/register',
  login: '/auth/login',
  session: '/auth/session',
  logout: '/auth/logout',

  nfts: '/nfts',
  nft: (id: string) => `/nfts/${encodeURIComponent(id)}`,

  favorites: '/favorites',
  favorite: (nftId: string) => `/favorites/${encodeURIComponent(nftId)}`,

  cart: '/cart',
  cartItems: '/cart/items',
  cartItem: (nftId: string, editionId: string) =>
    `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`,
  cartCoupon: '/cart/coupon',
  cartMerge: '/cart/merge',

  quotes: '/quotes',

  orders: '/orders',
  order: (id: string) => `/orders/${encodeURIComponent(id)}`,

  profile: '/profile',
  profileAvatar: '/profile/avatar',
  profilePassword: '/profile/password',

  wallets: '/wallets',
  wallet: (id: string) => `/wallets/${encodeURIComponent(id)}`,
  walletConnection: (id: string) => `/wallets/${encodeURIComponent(id)}/connection`,
} as const
