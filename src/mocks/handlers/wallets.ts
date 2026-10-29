import { http, HttpResponse } from 'msw'
import type { ApiErrorBody, Wallet, WalletInput, WalletsResponse } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { resolveMockSession } from './auth'

export const MOCK_WALLETS_STORAGE_KEY = 'kurio:mock:wallets:v1'
let memoryWallets: Record<string, Wallet[]> = {}

function readWallets(): Record<string, Wallet[]> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(MOCK_WALLETS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, Wallet[]>
  } catch { /* Unit tests use memory storage. */ }
  return memoryWallets
}

function writeWallets(value: Record<string, Wallet[]>): void {
  memoryWallets = value
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(MOCK_WALLETS_STORAGE_KEY, JSON.stringify(value)) } catch { /* The demo remains usable for this page lifetime. */ }
}

export function resetMockWallets(): void {
  memoryWallets = {}
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(MOCK_WALLETS_STORAGE_KEY) } catch { /* no-op */ }
}

export function getMockWallets(userId: string): Wallet[] {
  return readWallets()[userId] ?? []
}

function error(status: number, code: ApiErrorBody['code'], message: string) {
  return HttpResponse.json({ code, message } satisfies ApiErrorBody, { status })
}

export const walletHandlers = [
  http.get(`*${API_ROUTES.wallets}`, ({ request }) => {
    const session = resolveMockSession(request)
    if (session instanceof HttpResponse) return session
    return HttpResponse.json({ items: readWallets()[session.user.id] ?? [] } satisfies WalletsResponse)
  }),
  http.post(`*${API_ROUTES.wallets}`, async ({ request }) => {
    const session = resolveMockSession(request)
    if (session instanceof HttpResponse) return session
    let input: WalletInput
    try { input = await request.json() as WalletInput } catch { return error(400, 'VALIDATION_ERROR', 'Confira os dados da carteira.') }
    if (!input || !input.label?.trim() || !/^0x[a-fA-F0-9]{40}$/.test(input.address) || !['ethereum-mainnet', 'polygon', 'arbitrum', 'optimism', 'base'].includes(input.network) || !['metamask', 'walletconnect', 'coinbase'].includes(input.walletType) || !['primary', 'secondary'].includes(input.role)) {
      return error(400, 'VALIDATION_ERROR', 'Confira os dados da carteira.')
    }
    const store = readWallets()
    const wallets = store[session.user.id] ?? []
    if (wallets.some((wallet) => wallet.address.toLowerCase() === input.address.toLowerCase())) return error(409, 'CONFLICT', 'Esta carteira jÃ¡ estÃ¡ cadastrada.')
    const wallet: Wallet = { id: `wallet-${crypto.randomUUID()}`, ...input, label: input.label.trim(), alias: input.alias?.trim() || null, ensName: input.ensName?.trim() || null, connection: 'disconnected' }
    store[session.user.id] = [...wallets, wallet]
    writeWallets(store)
    return HttpResponse.json(wallet, { status: 201 })
  }),
]
