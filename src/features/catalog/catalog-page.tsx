import { useQuery } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Heart, Home, Menu, Search, ShoppingCart, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { API_ROUTES, parseNftListQuery, serializeNftListQuery, type NftListQuery, type NftListResponse, type NftNetwork, type NftTab } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { formatEth } from '@/shared/lib/eth'
import { useAuth } from '@/features/auth/auth-context'
import { FavoriteButton } from '@/features/favorites/favorite-button'

const categories = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade']
const networks: { label: string; value: NftNetwork }[] = [
  { label: 'Ethereum', value: 'ethereum-mainnet' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Solana', value: 'solana' },
]
const tabs: { label: string; value: NftTab; }[] = [
  { label: 'Todos os NFTs', value: 'all' },
  { label: 'Novos lançamentos', value: 'new' },
  { label: 'Em alta', value: 'trending' },
]
const stories = [
  { image: 'figma-ape-gold.png', date: '12 de setembro', category: 'Leitura de 5 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: 'figma-ape-green.png', date: '13 de setembro', category: 'Leitura de 4 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: 'figma-ape-violet.png', date: '15 de setembro', category: 'Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: 'figma-ape-sage.png', date: '16 de setembro', category: 'Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]
function apiParams(query: NftListQuery) {
  return {
    q: query.q,
    tab: query.tab,
    collection: query.collections,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    network: query.networks,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function CatalogPage() {
  const { session, logout } = useAuth()
  const searchStr = useLocation({ select: (location) => location.searchStr })
  const navigate = useNavigate({ from: '/' })
  const query = useMemo(() => parseNftListQuery(new URLSearchParams(searchStr)), [searchStr])
  const [searchText, setSearchText] = useState(query.q ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minText, setMinText] = useState(query.minPrice ?? '0.02')
  const [maxText, setMaxText] = useState(query.maxPrice ?? '12.30')

  useEffect(() => setSearchText(query.q ?? ''), [query.q])

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['nfts', query],
    queryFn: async () => {
      const result = await http.get<NftListResponse>(API_ROUTES.nfts, { params: apiParams(query) })
      return result.data
    },
  })

  function updateQuery(patch: Partial<NftListQuery>) {
    const next = { ...query, ...patch, page: patch.page ?? 1 }
    const queryString = serializeNftListQuery(next)
    void navigate({ to: queryString ? `/?${queryString}` : '/' })
  }

  function toggleValue<T extends string>(values: T[] | undefined, value: T): T[] {
    const current = values ?? []
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateQuery({ q: searchText.trim() || undefined })
  }

  const selectedTab = query.tab ?? 'all'
  const activeFilters = Boolean(query.collections?.length || query.networks?.length || query.minPrice || query.maxPrice)
  const content = data?.items ?? []

  return (
    <main className="kurio-shell">
      <div className="kurio-page">
        <header className="desktop-header">
          <a className="wordmark" href="/" aria-label="Kurio início">KURIO</a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a className="active" href="/">Início</a><a href="#catalog">Mercado</a><a href="#creators">Criadores</a><a href="#learn">Aprenda</a>
          </nav>
          <div className="header-actions"><button aria-label="Buscar" onClick={() => document.querySelector<HTMLInputElement>('.desktop-search input')?.focus()}><Search /></button><button aria-label="Carrinho"><ShoppingCart /><i>2</i></button>{session ? <><a className="signin" href="/favorites">{session.user.displayName}</a><button className="signin" onClick={() => void logout()}>Sair</button></> : <a className="signin" href="/login">Entrar</a>}</div>
        </header>

        <div className="mobile-search-row">
          <form className="mobile-search" onSubmit={submitSearch}><Search /><input aria-label="Buscar coleções" placeholder="Explorar coleções" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></form>
          <button className={`filter-trigger ${activeFilters ? 'has-filter' : ''}`} aria-label="Abrir filtros" onClick={() => setFiltersOpen(true)}><SlidersHorizontal /></button>
        </div>

        <section className="hero" aria-label="Bem-vindo à Kurio">
          <div className="hero-copy"><p className="hero-eyebrow">Bem-vindo à Kurio</p><h1 className="hero-title-desktop">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</h1><h1 className="hero-title-mobile">SEJA DONO DA<br />CULTURA DIGITAL</h1><p className="hero-description hero-description-desktop">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas autênticos e tenha uma parte da cultura da internet.</p><p className="hero-description hero-description-mobile">Descubra NFTs selecionados de criadores do mundo todo.</p><a className="hero-link" href="#catalog">EXPLORAR <ArrowRight size={17} /></a></div>
          <div className="hero-art"><img src="/nft-art/figma-ape-green.png" alt="Ape de óculos e jaqueta verde" /><img className="hero-art-small" src="/nft-art/figma-ape-violet.png" alt="Ape com chapéu e moletom violeta" /></div>
          <div className="hero-dots" aria-hidden="true"><span /><span /><span /></div>
        </section>

        <section className="catalog-section" id="catalog" aria-label="Catálogo de NFTs">
          <div className="mobile-toolbar">
            <form className="desktop-search" onSubmit={submitSearch}><Search /><input aria-label="Buscar NFTs" placeholder="Buscar NFTs, coleções e criadores" value={searchText} onChange={(event) => setSearchText(event.target.value)} /><button type="submit">Buscar</button></form>
            <label className="sort-control"><span>Ordenar:</span><select aria-label="Ordenar NFTs" value={query.sort ?? 'recent'} onChange={(event) => updateQuery({ sort: event.target.value as NftListQuery['sort'] })}><option value="recent">Mais recentes</option><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option><option value="name">Nome</option></select><ChevronDown size={15} /></label>
          </div>
          <div className="catalog-tabs" role="tablist" aria-label="Tipo de catálogo">
            {tabs.map((tab) => <button key={tab.value} role="tab" aria-selected={selectedTab === tab.value} className={selectedTab === tab.value ? 'selected' : ''} onClick={() => updateQuery({ tab: tab.value === 'all' ? undefined : tab.value })}>{tab.label}</button>)}
          </div>
          <div className="catalog-layout">
            <aside className={`filter-panel ${filtersOpen ? 'open' : ''}`} aria-label="Filtros do catálogo">
              <div className="mobile-filter-heading"><strong>Filtros</strong><button onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><X /></button></div>
              <FilterGroup title="Coleções">{categories.map((category, index) => <FilterCheck key={category} label={category} count={[33,12,65,39,23,17,19,13,18][index] ?? 0} checked={query.collections?.includes(category) ?? false} onChange={() => updateQuery({ collections: toggleValue(query.collections, category) })} />)}</FilterGroup>
              <FilterGroup title="Faixa de preço">
                <div className="price-range"><input aria-label="Preço mínimo em ETH" inputMode="decimal" value={minText} onChange={(event) => setMinText(event.target.value)} /><span>—</span><input aria-label="Preço máximo em ETH" inputMode="decimal" value={maxText} onChange={(event) => setMaxText(event.target.value)} /></div>
                <p className="price-caption">ETH</p><button className="apply-button" onClick={() => updateQuery({ minPrice: minText as NftListQuery['minPrice'], maxPrice: maxText as NftListQuery['maxPrice'] })}>Aplicar</button>
              </FilterGroup>
              <FilterGroup title="Rede">{networks.map((network, index) => <FilterCheck key={network.value} label={network.label} count={[119,78,86][index] ?? 0} checked={query.networks?.includes(network.value) ?? false} onChange={() => updateQuery({ networks: toggleValue(query.networks, network.value) })} />)}</FilterGroup>
              <button className="clear-filters" onClick={() => { setMinText('0.02'); setMaxText('12.30'); updateQuery({ collections: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined, q: query.q, sort: query.sort, tab: query.tab }) }}>Limpar filtros</button>
            </aside>
            {filtersOpen && <button className="filter-scrim" aria-label="Fechar filtros" onClick={() => setFiltersOpen(false)} />}
            <div className="catalog-results">
              <div className="results-heading"><span>{data ? `${data.total} NFTs encontrados` : 'Descubra peças únicas'}</span><span>Ordenar por <strong>{sortLabel(query.sort)}</strong></span></div>
              {isPending ? <div className="nft-grid" aria-label="Carregando NFTs">{Array.from({ length: 6 }, (_, i) => <NftSkeleton key={i} />)}</div>
                : error ? <div className="catalog-state error-state"><div><h2>Não foi possível carregar o catálogo</h2><p>{error instanceof ApiError ? error.message : axios.isAxiosError(error) ? 'Verifique sua conexão e tente novamente.' : 'Ocorreu um erro inesperado.'}</p><button className="apply-button" onClick={() => void refetch()}>Tentar novamente</button></div></div>
                : content.length === 0 ? <div className="catalog-state"><div><h2>Nenhum NFT encontrado</h2><p>Tente ajustar a busca ou remover alguns filtros.</p><button className="apply-button" onClick={() => { setSearchText(''); updateQuery({ q: undefined, collections: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined }) }}>Limpar busca e filtros</button></div></div>
                : <div className="nft-grid">{content.map((nft, index) => <article className="nft-card" key={nft.id}><div className="nft-image-wrap"><Link to="/nft/$nftId" params={{ nftId: nft.id }} className="nft-image-link"><img className="nft-image" src={nft.images[0]?.url} alt={nft.images[0]?.alt ?? nft.name} loading={index > 5 ? 'lazy' : 'eager'} /></Link>{index === 2 && <span className="rarity-tag">RARO</span>}<FavoriteButton nftId={nft.id} className="favorite-button" /></div><div className="nft-info"><h3>{nft.name} <span>{nft.tokenId}</span></h3><p>{formatEth(nft.price)}</p><span className="collection-name">{nft.collection.name}</span></div></article>)}</div>}
              {data && data.totalPages > 1 && <nav className="pagination" aria-label="Paginação do catálogo"><button aria-label="Página anterior" disabled={(query.page ?? 1) <= 1} onClick={() => updateQuery({ page: (query.page ?? 1) - 1 })}><ChevronLeft size={17} /></button>{Array.from({ length: data.totalPages }, (_, index) => index + 1).map((page) => <button key={page} className={(query.page ?? 1) === page ? 'current' : ''} aria-current={(query.page ?? 1) === page ? 'page' : undefined} onClick={() => updateQuery({ page })}>{page}</button>)}<button aria-label="Próxima página" disabled={(query.page ?? 1) >= data.totalPages} onClick={() => updateQuery({ page: (query.page ?? 1) + 1 })}><ChevronRight size={17} /></button></nav>}
            </div>
          </div>
        </section>

        <section className="home-promotions" aria-label="Destaques Kurio">
          <article className="promotion-card"><img src="/nft-art/figma-ape-green.png" alt="Arte de gorila com jaqueta verde" /><div><p className="section-kicker">Lançamentos gênesis de edição limitada</p><p>Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><a href="#catalog">Explorar <ArrowRight size={13} /></a></div></article>
          <article className="promotion-card reverse"><img src="/nft-art/figma-ape-gold.png" alt="Arte de gorila em blazer" /><div><p className="section-kicker">Arte digital selecionada e muito mais</p><p>Explore novos artistas, coleções verificadas e obras digitais que definem a cena.</p><a href="#catalog">Explorar <ArrowRight size={13} /></a></div></article>
        </section>

        <section className="editorial-section" aria-labelledby="editorial-title">
          <div className="editorial-heading"><h2 id="editorial-title">Diário da Cunhagem</h2><p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p></div>
          <div className="story-grid">{stories.map((story) => <article className="story-card" key={story.title}><img src={`/nft-art/${story.image}`} alt="" loading="lazy" /><div><p className="story-meta">{story.date}<span> · </span>{story.category}</p><h3>{story.title}</h3><p>{story.text}</p><span className="story-read">Ler mais →</span></div></article>)}</div>
        </section>

        <footer className="site-footer">
          <div className="footer-benefits"><section><span className="benefit-mark">W</span><h2>Segurança da carteira</h2><p>Proteja sua carteira e colecione arte digital verificada com confiança.</p></section><section><span className="benefit-mark">C</span><h2>Criadores em destaque</h2><p>Conheça artistas, estúdios e comunidades que moldam a cultura digital.</p></section><section><span className="benefit-mark">D</span><h2>Alertas de lançamentos</h2><p>Receba calendário de lançamentos, novidades e listas selecionadas do mercado.</p></section><section className="newsletter-note"><h2>Antecipe-se ao próximo lançamento</h2><p>Novidades e histórias selecionadas do universo Kurio.</p></section></div>
          <div className="footer-brand"><strong>KURIO</strong><span>Feito para colecionadores,<br />criadores e cultura</span><span>contato@kurio.com</span><span>+55 11 4002 8922</span></div>
          <div className="footer-links"><section><h2>Meu perfil</h2><span>Minha coleção</span><span>Atividade</span><span>Estúdio do criador</span><span>Lista de interesse</span></section><section><h2>Central de ajuda</h2><span>Carteira e segurança</span><span>Como comprar NFTs</span><span>Política do mercado</span><span>Denunciar item</span></section><section><h2>Coleções</h2><span>Arte digital</span><span>Fotografia</span><span>Música</span><span>Utilidade</span></section><section><h2>Redes sociais</h2><span className="social-icons">f&nbsp; ◎&nbsp; ◉&nbsp; in&nbsp; ▣</span><h2>Carteiras compatíveis</h2><span className="wallet-list">METAMASK · WALLETCONNECT · COINBASE</span></section></div>
          <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
        </footer>
      </div>
      <nav className="mobile-tabbar" aria-label="Navegação mobile"><a className="tabbar-active" href="/" aria-label="Início"><Home /></a><a href={session ? '/favorites' : '/login?returnTo=%2Ffavorites'} aria-label="Favoritos"><Heart /></a><span className="tabbar-center"><Menu /></span><button aria-label="Carrinho"><ShoppingCart /></button><a href={session ? '/favorites' : '/login?returnTo=%2Ffavorites'} aria-label="Perfil"><UserRound /></a></nav>
    </main>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) { return <section className="filter-group"><h2>{title}</h2><div className="filter-options">{children}</div></section> }

function FilterCheck({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return <label className={`filter-check ${checked ? 'checked' : ''}`}><input type="checkbox" checked={checked} onChange={onChange} /><span className="fake-checkbox" /><span>{label}</span><b>({count})</b></label>
}

function NftSkeleton() { return <article className="nft-card skeleton-card"><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></article> }

function sortLabel(sort: NftListQuery['sort']) { return ({ recent: 'Mais recentes', price_asc: 'Menor preço', price_desc: 'Maior preço', name: 'Nome' } as const)[sort ?? 'recent'] }

