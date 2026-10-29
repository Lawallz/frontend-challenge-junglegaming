import { NftArtwork } from '@/shared/ui/nft-artwork'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Heart, Home, Menu, Minus, Plus, RefreshCw, ShoppingCart, Star, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { Cart, NftListResponse } from '@/shared/api/contracts'
import { API_ROUTES } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { formatEth } from '@/shared/lib/eth'
import { addCartItem, cartQueryKey, getCart } from '@/features/cart/cart-api'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { useAuth } from '@/features/auth/auth-context'
import { nftDetailQuery } from './nft-detail-query'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [editionId, setEditionId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details')

  const nftQuery = useQuery(nftDetailQuery(nftId))
  const cartQuery = useQuery({ queryKey: cartQueryKey(session?.user.id), queryFn: getCart })
  const cartMutation = useMutation({
    mutationFn: addCartItem,
    onSuccess: (cart) => queryClient.setQueryData<Cart>(cartQueryKey(session?.user.id), cart),
  })
  const nft = nftQuery.data
  const edition = nft?.editions.find((item) => item.id === editionId) ?? nft?.editions[0]
  const relatedQuery = useQuery({
    queryKey: ['related-nfts', nft?.collection.id],
    enabled: Boolean(nft),
    queryFn: async () => (await http.get<NftListResponse>(API_ROUTES.nfts, {
      params: { collection: [nft!.collection.name], pageSize: 100, sort: 'recent' },
    })).data,
  })
  const related = relatedQuery.data?.items.filter((item) => item.id !== nft?.id).slice(0, 4) ?? []
  const cartCount = cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const favoriteHref = session ? '/favorites' : `/login?returnTo=${encodeURIComponent(`/nft/${nftId}`)}`

  function addToCart() {
    if (!nft || !edition || edition.available < quantity) return
    cartMutation.reset()
    cartMutation.mutate({ nftId: nft.id, editionId: edition.id, quantity })
  }

  return (
    <main className="detail-shell">
      <div className="detail-page">
        <header className="desktop-header detail-desktop-header">
          <Link className="wordmark" to="/" aria-label="Kurio início">KURIO</Link>
          <nav className="desktop-nav" aria-label="Navegação principal"><Link to="/">Início</Link><a href="/#catalog">Mercado</a><a href="/#creators">Criadores</a><a href="/#learn">Aprenda</a></nav>
          <div className="header-actions"><Link className="detail-cart-link" to="/cart" aria-label={`Carrinho, ${cartCount} itens`}><ShoppingCart /><i>{cartCount}</i></Link>{session ? <a className="signin" href="/profile">{session.user.displayName}</a> : <a className="signin" href="/login">Entrar</a>}</div>
        </header>
        <header className="detail-mobile-topbar"><Link to="/" aria-label="Voltar ao catálogo"><ArrowLeft /></Link><Link className="wordmark" to="/">KURIO</Link><Link className="detail-cart-link" to="/cart" aria-label={`Carrinho, ${cartCount} itens`}><ShoppingCart /><i>{cartCount}</i></Link></header>

        <div className="detail-breadcrumb"><Link to="/">Início</Link><span>/</span><span>Mercado</span><span>/</span><span>{nft?.collection.name ?? 'NFT'}</span><button className="detail-refresh-button" disabled={nftQuery.isFetching} onClick={() => void nftQuery.refetch()}><RefreshCw />{nftQuery.isFetching ? 'Atualizando' : 'Atualizar'}</button></div>

        {nftQuery.isPending ? <DetailSkeleton />
          : nftQuery.error ? nftQuery.error instanceof ApiError && nftQuery.error.status === 404
            ? <section className="detail-state"><span className="detail-state-mark">404</span><h1>NFT não encontrado</h1><p>Este item não está disponível ou foi removido do catálogo.</p><Link className="detail-primary-link" to="/">Voltar ao mercado</Link></section>
            : <section className="detail-state"><h1>Não foi possível carregar este NFT</h1><p>{nftQuery.error instanceof ApiError ? nftQuery.error.message : 'Ocorreu um erro ao carregar os detalhes.'}</p><button className="detail-primary-button" onClick={() => void nftQuery.refetch()}>Tentar novamente</button></section>
          : nft && <>
            {nftQuery.isFetching && <div className="detail-refreshing" role="status">Atualizando informações do NFT…</div>}
            <section className="detail-product" aria-label={`Detalhes de ${nft.name}`}>
              <div className="detail-gallery">
                <div className="detail-main-image"><NftArtwork fetchPriority="high" sizes="(max-width: 767px) calc(100vw - 32px), 560px" src={nft.images[activeImage]?.url ?? nft.images[0]?.url} alt={nft.images[activeImage]?.alt ?? nft.name} /><span className="gallery-counter">{activeImage + 1} / {Math.max(nft.images.length, 1)}</span><button className="gallery-prev" aria-label="Imagem anterior" disabled={activeImage <= 0} onClick={() => setActiveImage((value) => Math.max(0, value - 1))}><ChevronLeft /></button><button className="gallery-next" aria-label="Próxima imagem" disabled={activeImage >= nft.images.length - 1} onClick={() => setActiveImage((value) => Math.min(nft.images.length - 1, value + 1))}><ChevronRight /></button></div>
                {nft.images.length > 1 && <div className="detail-thumbnails">{nft.images.map((image, index) => <button key={image.id} className={index === activeImage ? 'selected' : ''} aria-label={`Ver imagem ${index + 1}`} onClick={() => setActiveImage(index)}><NftArtwork src={image.url} alt="" /></button>)}</div>}
                <div className="detail-chain"><span className="chain-dot" />{networkLabel(nft.chain.network)}<span>·</span>{nft.chain.standard}<span>·</span>{nft.chain.metadataStorage.toUpperCase()}</div>
              </div>

              <div className="detail-purchase-column">
                <div className="detail-collection-line"><span>{nft.collection.name}</span><FavoriteButton nftId={nft.id} className="detail-favorite" size={16} showLabel /></div>
                <h1 className="detail-title">{nft.name} <span>{nft.tokenId}</span></h1>
                <div className="detail-rating"><span className="rating-stars" role="img" aria-label={`${nft.rating.average.toFixed(1)} de 5 estrelas`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} fill={i < Math.round(nft.rating.average) ? 'currentColor' : 'none'} />)}</span><strong>{nft.rating.average.toFixed(1)}</strong><button onClick={() => setActiveTab('reviews')}>({nft.rating.count} avaliações)</button></div>
                <p className="detail-description">{nft.description}</p>

                <div className="purchase-panel">
                  <div className="detail-price-line"><div><span className="detail-muted-label">Preço atual</span><strong className="detail-price">{formatEth(nft.price)}</strong></div>{nft.previousPrice && <del>{formatEth(nft.previousPrice)}</del>}</div>
                  <label className="edition-select-label" htmlFor="edition-select">Edição</label>
                  <div className="edition-select-wrap"><select id="edition-select" value={edition?.id ?? ''} onChange={(event) => { setEditionId(event.target.value); setQuantity(1) }} disabled={!nft.editions.length}><option value="" disabled>Selecione uma edição</option>{nft.editions.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.available} disponíveis</option>)}</select><ChevronDown /></div>
                  <div className="purchase-availability"><span>{edition ? `${edition.available} disponíveis` : 'Sem edições disponíveis'}</span><span>{edition?.supply ?? 0} no total</span></div>
                  <div className="purchase-actions"><div className="quantity-stepper" role="group" aria-label="Quantidade"><button aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus /></button><output>{quantity}</output><button aria-label="Aumentar quantidade" disabled={!edition || quantity >= edition.available} onClick={() => setQuantity((value) => Math.min(edition?.available ?? value, value + 1))}><Plus /></button></div><button className="detail-primary-button add-cart-button" disabled={!edition || edition.available === 0 || cartMutation.isPending} onClick={addToCart}>{cartMutation.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}</button></div>
                  {cartMutation.isSuccess && <p className="cart-feedback success" role="status"><Check /> Item adicionado ao carrinho.</p>}
                  {cartMutation.error && <p className="cart-feedback error" role="alert">{cartMutation.error instanceof ApiError ? cartMutation.error.message : 'Não foi possível adicionar o item.'}</p>}
                </div>
                <div className="detail-owner-row"><span className="owner-avatar">K</span><span><small>Criado por</small><strong>{nft.collection.name}</strong></span><ArrowUpRight /></div>
              </div>
            </section>

            <section className="detail-information">
              <div className="detail-tabs" role="tablist" aria-label="Informações do NFT"><button role="tab" aria-selected={activeTab === 'details'} className={activeTab === 'details' ? 'selected' : ''} onClick={() => setActiveTab('details')}>Detalhes</button><button role="tab" aria-selected={activeTab === 'reviews'} className={activeTab === 'reviews' ? 'selected' : ''} onClick={() => setActiveTab('reviews')}>Avaliações <span>{nft.rating.count}</span></button></div>
              {activeTab === 'details' ? <div className="detail-attributes"><div className="detail-description-block"><h2>Sobre esta peça</h2><p>{nft.description}</p></div><div className="attribute-list"><h2>Atributos</h2>{nft.attributes.map((attribute, index) => <div className="attribute-chip" key={`${attribute}-${index}`}><span>ATRIBUTO {String(index + 1).padStart(2, '0')}</span><strong>{attribute}</strong></div>)}</div><div className="contract-information"><h2>Informações do contrato</h2><dl><div><dt>Endereço</dt><dd title={nft.chain.contractAddress}>{shortAddress(nft.chain.contractAddress)}</dd></div><div><dt>Rede</dt><dd>{networkLabel(nft.chain.network)}</dd></div><div><dt>Padrão</dt><dd>{nft.chain.standard}</dd></div><div><dt>Token ID</dt><dd>{nft.tokenId}</dd></div></dl></div></div>
                : <div className="reviews-panel"><div className="review-score"><strong>{nft.rating.average.toFixed(1)}</strong><span className="rating-stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} fill={i < Math.round(nft.rating.average) ? 'currentColor' : 'none'} />)}</span><small>{nft.rating.count} avaliações</small></div><div><h2>Avaliações da comunidade</h2><p>As avaliações detalhadas ainda não estão disponíveis para esta peça.</p></div></div>}
            </section>

            <section className="related-section"><div className="related-heading"><div><p className="detail-eyebrow">CONTINUE EXPLORANDO</p><h2>Mais da coleção {nft.collection.name}</h2></div><Link to="/" className="related-all">Ver coleção <ArrowUpRight /></Link></div>{relatedQuery.isPending ? <div className="related-grid">{Array.from({ length: 4 }, (_, i) => <DetailRelatedSkeleton key={i} />)}</div> : relatedQuery.error ? <div className="related-inline-error">Não foi possível carregar outros itens da coleção. <button onClick={() => void relatedQuery.refetch()}>Tentar novamente</button></div> : related.length ? <div className="related-grid">{related.map((item) => <Link className="related-card" key={item.id} to="/nft/$nftId" params={{ nftId: item.id }}><NftArtwork src={item.images[0]?.url} alt={item.images[0]?.alt ?? item.name} loading="lazy" /><span>{item.collection.name}</span><strong>{item.name}</strong><small>{formatEth(item.price)}</small></Link>)}</div> : <p className="related-empty">Ainda não há outros itens disponíveis nesta coleção.</p>}</section>
          </>}
      </div>
      <nav className="mobile-tabbar detail-mobile-tabbar" aria-label="Navegação mobile"><Link className="tabbar-active" to="/" aria-label="Início"><Home /></Link><a href={favoriteHref} aria-label="Entrar para ver favoritos"><Heart /></a><span className="tabbar-center"><Menu /></span><Link to="/cart" aria-label={`Carrinho, ${cartCount} itens`}><ShoppingCart /></Link><a href={session ? '/profile' : '/login?returnTo=%2Fprofile'} aria-label="Minha conta"><UserRound /></a></nav>
    </main>
  )
}

function DetailSkeleton() {
  return <div className="detail-skeleton" role="status" aria-live="polite" aria-label="Carregando detalhes do NFT"><div className="detail-skeleton-art" /><div className="detail-skeleton-copy"><span /><span /><span /><span /><div /></div></div>
}

function DetailRelatedSkeleton() {
  return <div className="related-skeleton"><div /><span /><span /></div>
}

function networkLabel(network: string) {
  return network === 'ethereum-mainnet' ? 'Ethereum' : network.charAt(0).toUpperCase() + network.slice(1)
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`
}
