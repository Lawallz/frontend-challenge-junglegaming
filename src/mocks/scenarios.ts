export type MockScenarioName = 'catalog-default' | 'catalog-resilience' | 'catalog-failure'

export interface MockScenario {
  name: MockScenarioName
  latencyMs: number
  failCatalog: boolean
  failDetails: boolean
}

export const MOCK_SCENARIOS: Record<MockScenarioName, MockScenario> = {
  'catalog-default': { name: 'catalog-default', latencyMs: 0, failCatalog: false, failDetails: false },
  'catalog-resilience': { name: 'catalog-resilience', latencyMs: 350, failCatalog: false, failDetails: false },
  'catalog-failure': { name: 'catalog-failure', latencyMs: 0, failCatalog: true, failDetails: true },
}

let scenarioOverride: MockScenarioName | undefined

export function setMockScenario(name: MockScenarioName): void {
  scenarioOverride = name
}

export function getScenario(): MockScenario {
  const configured = import.meta.env.VITE_MOCK_SCENARIO as MockScenarioName | undefined
  const name = scenarioOverride ?? configured ?? 'catalog-default'
  return MOCK_SCENARIOS[name] ?? MOCK_SCENARIOS['catalog-default']
}

/** No runtime overrides yet; reset returns every handler to configured fixture scenario. */
export function resetMockScenario(): void {
  scenarioOverride = undefined
}
