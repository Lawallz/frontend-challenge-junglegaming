import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/errors'

/**
 * Política inicial de cache/retry (documentada em ARCHITECTURE.md):
 * - retry só para falhas transitórias/rede/timeout, até 2 vezes;
 * - 4xx de negócio (validação, sessão, permissão, 404, conflito) nunca são repetidos.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => error instanceof ApiError && error.isRetryable && failureCount < 2,
      },
      mutations: { retry: false },
    },
  })
}
