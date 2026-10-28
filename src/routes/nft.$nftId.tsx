import { createFileRoute } from '@tanstack/react-router'
import { NftDetailPage } from '@/features/nft-detail/nft-detail-page'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})
