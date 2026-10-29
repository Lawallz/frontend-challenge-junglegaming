export type MockScenarioName = 'catalog-default' | 'catalog-resilience' | 'catalog-failure' | 'cart-resilience' | 'cart-failure' | 'checkout-resilience' | 'checkout-failure' | 'checkout-stock-changed'

export interface MockScenario {
  name: MockScenarioName
  latencyMs: number
  failCatalog: boolean
  failDetails: boolean
  latencyCartMs: number
  failCart: boolean
  latencyOrdersMs: number
  failOrders: boolean
  stockChanged: boolean
}

export const MOCK_SCENARIOS: Record<MockScenarioName, MockScenario> = {
  'catalog-default': { name: 'catalog-default', latencyMs: 0, failCatalog: false, failDetails: false, latencyCartMs: 0, failCart: false, latencyOrdersMs: 0, failOrders: false, stockChanged: false },
  'catalog-resilience': { name: 'catalog-resilience', latencyMs: 350, failCatalog: false, failDetails: false, latencyCartMs: 0, failCart: false, latencyOrdersMs: 0, failOrders: false, stockChanged: false },
  'catalog-failure': { name: 'catalog-failure', latencyMs: 0, failCatalog: true, failDetails: true, latencyCartMs: 0, failCart: false, latencyOrdersMs: 0, failOrders: false, stockChanged: false },
  'cart-resilience': { name: 'cart-resilience', latencyMs: 0, failCatalog: false, failDetails: false, latencyCartMs: 900, failCart: false, latencyOrdersMs: 0, failOrders: false, stockChanged: false },
  'cart-failure': { name: 'cart-failure', latencyMs: 0, failCatalog: false, failDetails: false, latencyCartMs: 0, failCart: true, latencyOrdersMs: 0, failOrders: false, stockChanged: false },
  'checkout-resilience': { name: 'checkout-resilience', latencyMs: 0, failCatalog: false, failDetails: false, latencyCartMs: 0, failCart: false, latencyOrdersMs: 1100, failOrders: false, stockChanged: false },
  'checkout-failure': { name: 'checkout-failure', latencyMs: 0, failCatalog: false, failDetails: false, latencyCartMs: 0, failCart: false, latencyOrdersMs: 0, failOrders: true, stockChanged: false },
  'checkout-stock-changed': { name: 'checkout-stock-changed', latencyMs: 0, failCatalog: false, failDetails: false, latencyCartMs: 0, failCart: false, latencyOrdersMs: 0, failOrders: false, stockChanged: true },
}

let scenarioOverride: MockScenarioName | undefined
export const MOCK_SCENARIO_STORAGE_KEY = 'kurio:mock:scenario'

export function setMockScenario(name: MockScenarioName): void {
  scenarioOverride = name
}

export function getScenario(): MockScenario {
  const configured = import.meta.env.VITE_MOCK_SCENARIO as MockScenarioName | undefined
  let runtimeOverride: MockScenarioName | undefined
  try {
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(MOCK_SCENARIO_STORAGE_KEY)
    if (stored && stored in MOCK_SCENARIOS) runtimeOverride = stored as MockScenarioName
  } catch { /* Unit tests may not provide localStorage. */ }
  const name = scenarioOverride ?? runtimeOverride ?? configured ?? 'catalog-default'
  return MOCK_SCENARIOS[name] ?? MOCK_SCENARIOS['catalog-default']
}

/** No runtime overrides yet; reset returns every handler to configured fixture scenario. */
export function resetMockScenario(): void {
  scenarioOverride = undefined
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(MOCK_SCENARIO_STORAGE_KEY) } catch { /* no-op */ }
}
