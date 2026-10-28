import { AxiosError } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from './contracts/common'

export type { ApiErrorBody, ApiErrorCode }

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly fieldErrors: Record<string, string> | undefined

  constructor(init: {
    code: ApiErrorCode
    message: string
    status?: number | null
    fieldErrors?: Record<string, string>
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status ?? null
    this.fieldErrors = init.fieldErrors
  }

  /** Falhas que fazem sentido repetir automaticamente. */
  get isRetryable() {
    return this.code === 'TRANSIENT_FAILURE' || this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ code: 'TIMEOUT', message: 'A requisição demorou demais.' })
    }
    if (!error.response) {
      return new ApiError({ code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor.' })
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    return new ApiError({
      code: body?.code ?? (error.response.status >= 500 ? 'TRANSIENT_FAILURE' : 'UNKNOWN'),
      message: body?.message ?? error.message,
      status: error.response.status,
      fieldErrors: body?.fieldErrors,
    })
  }
  return new ApiError({ code: 'UNKNOWN', message: error instanceof Error ? error.message : 'Erro desconhecido.' })
}
