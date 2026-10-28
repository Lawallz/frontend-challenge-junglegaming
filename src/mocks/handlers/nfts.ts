import { http, HttpResponse } from 'msw'
import { API_ROUTES, parseNftListQuery, type NftListResponse } from '@/shared/api/contracts'
import { nftFixtures } from '../fixtures/nfts'
import { getScenario } from '../scenarios'
import { applyScenario, errorResponse } from './utils'
import { filterSortNfts } from './catalog-query'

export const nftHandlers = [
  http.get(`*${API_ROUTES.nfts}`, async ({ request }) => {
    const scenario = getScenario()
    await applyScenario(scenario)
    if (scenario.failCatalog) return errorResponse(503, 'TRANSIENT_FAILURE', 'Catálogo temporariamente indisponível.')
    const query = parseNftListQuery(new URL(request.url).searchParams)
    const filtered = filterSortNfts(nftFixtures, query)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 12
    const total = filtered.length
    const response: NftListResponse = { items: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    return HttpResponse.json(response)
  }),
  http.get(`*${API_ROUTES.nfts}/:id`, async ({ params }) => {
    const scenario = getScenario()
    await applyScenario(scenario)
    if (scenario.failDetails) return errorResponse(503, 'TRANSIENT_FAILURE', 'Detalhes temporariamente indisponíveis.')
    const nft = nftFixtures.find((item) => item.id === params.id)
    return nft ? HttpResponse.json(nft) : errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
  }),
]
