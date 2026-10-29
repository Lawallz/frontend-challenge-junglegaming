import { queryOptions } from '@tanstack/react-query'
import { API_ROUTES, type NftDetailResponse } from '@/shared/api/contracts'
import { http } from '@/shared/api/http'

export const nftDetailQuery = (id: string) => queryOptions({
  queryKey: ['nft', id],
  queryFn: async ({ signal }) => (await http.get<NftDetailResponse>(API_ROUTES.nft(id), { signal })).data,
})
