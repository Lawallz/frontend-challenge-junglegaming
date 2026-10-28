import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Heart, LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { FavoriteButton } from './favorite-button'
import { getFavorites } from './favorites-api'
import type { NftDetailResponse } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { formatEth } from '@/shared/lib/eth'

export function FavoritesPage() {
  const { session, logout, handleSessionExpired } = useAuth()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['favorites', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const favorites = await getFavorites()
      return Promise.all(favorites.map(async (favorite) => ({
        ...favorite,
        nft: (await http.get<NftDetailResponse>(API_ROUTES.nft(favorite.nftId))).data,
      })))
    },
  })

  useEffect(() => {
    if (query.error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(query.error.code)) handleSessionExpired(query.error.code === 'SESSION_EXPIRED')
  }, [handleSessionExpired, query.error])

  return (
    <main className="favorites-shell">
      <div className="favorites-page">
        <header className="favorites-header"><Link to="/" className="wordmark">KURIO</Link><span className="favorites-user">{session?.user.displayName}</span><button onClick={() => void logout().then(() => navigate({ to: '/' }))}><LogOut />Sair</button></header>
        <div className="favorites-back"><Link to="/"><ArrowLeft />Voltar ao mercado</Link></div>
        <section className="favorites-content">
          <p className="auth-eyebrow">SUA COLEÇÃO PESSOAL</p><h1>Seus favoritos</h1><p className="favorites-intro">Peças que você guardou para acompanhar.</p>
          {query.isPending ? <div className="favorites-grid" aria-label="Carregando favoritos">{Array.from({ length: 4 }, (_, index) => <div className="favorite-skeleton" key={index} />)}</div>
            : query.error ? <div className="favorites-message error" role="alert"><h2>Não foi possível carregar seus favoritos</h2><p>{query.error instanceof ApiError ? query.error.message : 'Tente novamente em instantes.'}</p><button onClick={() => void query.refetch()}>Tentar novamente</button></div>
              : query.data?.length ? <div className="favorites-grid">{query.data.map(({ nft }) => <article className="favorite-card" key={nft.id}><div className="favorite-card-art"><Link to="/nft/$nftId" params={{ nftId: nft.id }}><img src={nft.images[0]?.url} alt={nft.images[0]?.alt ?? nft.name} /></Link><FavoriteButton nftId={nft.id} className="favorite-remove" size={16} /></div><div className="favorite-card-info"><span>{nft.collection.name}</span><Link to="/nft/$nftId" params={{ nftId: nft.id }}><strong>{nft.name} {nft.tokenId}</strong></Link><b>{formatEth(nft.price)}</b></div></article>)}</div>
                : <div className="favorites-message"><Heart /><h2>Ainda não há favoritos</h2><p>Explore o mercado e guarde as peças que chamarem sua atenção.</p><Link className="auth-submit" to="/">Explorar NFTs</Link></div>}
        </section>
      </div>
    </main>
  )
}
