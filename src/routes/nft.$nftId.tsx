import { createFileRoute } from '@tanstack/react-router'
import { NftDetailPage } from '@/features/nft-detail/nft-detail-page'
import { nftDetailQuery } from '@/features/nft-detail/nft-detail-query'

export const Route = createFileRoute('/nft/$nftId')({
  // Start REST while the page chunk loads; useQuery shares/deduplicates this request.
  beforeLoad: ({ context, params }) => { void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId)) },
  component: NftDetailPage,
})
