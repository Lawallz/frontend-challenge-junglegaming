import type { ApiErrorBody } from '@/shared/api/contracts'
import type { MockScenario } from '../scenarios'

export async function applyScenario(scenario: MockScenario): Promise<void> {
  if (scenario.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, scenario.latencyMs))
}

export function errorResponse(status: number, code: ApiErrorBody['code'], message: string) {
  return Response.json({ code, message } satisfies ApiErrorBody, { status })
}
