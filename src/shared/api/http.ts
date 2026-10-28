import axios from 'axios'
import { toApiError } from './errors'
import { serializeNftListQuery } from './contracts/nft-query'

const arrayQueryKeys = new Set(['collection', 'network'])

/**
 * Único cliente HTTP da aplicação. Não contém dados nem caminhos alternativos de
 * negócio: as respostas vêm sempre da rede (reais ou interceptadas pelo MSW).
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: {
    serialize(params) {
      if (Object.keys(params).some((key) => arrayQueryKeys.has(key))) {
        const queryKeys = new Set(['q', 'tab', 'collection', 'minPrice', 'maxPrice', 'network', 'sort', 'page', 'pageSize'])
        const query = Object.fromEntries(Object.entries(params).filter(([key]) => queryKeys.has(key)).map(([key, value]) => [key === 'collection' ? 'collections' : key === 'network' ? 'networks' : key, value]))
        const passthrough = Object.fromEntries(Object.entries(params).filter(([key]) => !queryKeys.has(key)))
        const catalog = serializeNftListQuery(query)
        const extra = new URLSearchParams(passthrough as Record<string, string>).toString()
        return [catalog, extra].filter(Boolean).join('&')
      }
      return new URLSearchParams(params as Record<string, string>).toString()
    },
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
)
