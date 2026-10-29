export type MockScenarioName='catalog-default'|'catalog-resilience'|'catalog-failure'|'cart-resilience'|'cart-failure'|'checkout-resilience'|'checkout-failure'|'checkout-stock-changed'|'account-resilience'|'account-failure'|'realtime-price-update'|'realtime-edition-soldout'|'realtime-order-confirmed'|'realtime-order-declined'|'realtime-order-pending'|'realtime-order-duplicate'|'realtime-disconnect'|'realtime-latency'
export interface MockScenario{name:MockScenarioName;latencyMs:number;failCatalog:boolean;failDetails:boolean;latencyCartMs:number;failCart:boolean;latencyOrdersMs:number;failOrders:boolean;stockChanged:boolean;latencyAccountMs:number;failAccount:boolean}
const base=(name:MockScenarioName,extra:Partial<MockScenario>={}):MockScenario=>({name,latencyMs:0,failCatalog:false,failDetails:false,latencyCartMs:0,failCart:false,latencyOrdersMs:0,failOrders:false,stockChanged:false,latencyAccountMs:0,failAccount:false,...extra})
export const MOCK_SCENARIOS:Record<MockScenarioName,MockScenario>={
'catalog-default':base('catalog-default'),'catalog-resilience':base('catalog-resilience',{latencyMs:350}),'catalog-failure':base('catalog-failure',{failCatalog:true,failDetails:true}),
'cart-resilience':base('cart-resilience',{latencyCartMs:900}),'cart-failure':base('cart-failure',{failCart:true}),
'checkout-resilience':base('checkout-resilience',{latencyOrdersMs:1100}),'checkout-failure':base('checkout-failure',{failOrders:true}),'checkout-stock-changed':base('checkout-stock-changed',{stockChanged:true}),
'account-resilience':base('account-resilience',{latencyAccountMs:800}),'account-failure':base('account-failure',{failAccount:true}),
'realtime-price-update':base('realtime-price-update'),'realtime-edition-soldout':base('realtime-edition-soldout'),'realtime-order-confirmed':base('realtime-order-confirmed'),'realtime-order-declined':base('realtime-order-declined'),'realtime-order-pending':base('realtime-order-pending',{latencyOrdersMs:1500}),'realtime-order-duplicate':base('realtime-order-duplicate'),'realtime-disconnect':base('realtime-disconnect'),'realtime-latency':base('realtime-latency')
}
let scenarioOverride:MockScenarioName|undefined
export const MOCK_SCENARIO_STORAGE_KEY='kurio:mock:scenario'
export function setMockScenario(name:MockScenarioName){scenarioOverride=name}
export function getScenario(){const configured=import.meta.env.VITE_MOCK_SCENARIO as MockScenarioName|undefined;let runtime:MockScenarioName|undefined;try{const stored=typeof localStorage==='undefined'?null:localStorage.getItem(MOCK_SCENARIO_STORAGE_KEY);if(stored&&stored in MOCK_SCENARIOS)runtime=stored as MockScenarioName}catch{}const name=scenarioOverride??runtime??configured??'catalog-default';return MOCK_SCENARIOS[name]??MOCK_SCENARIOS['catalog-default']}
export function resetMockScenario(){scenarioOverride=undefined;try{if(typeof localStorage!=='undefined')localStorage.removeItem(MOCK_SCENARIO_STORAGE_KEY)}catch{}}
