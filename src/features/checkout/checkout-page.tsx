import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, CreditCard, RefreshCw, Home, Heart, Menu, ShoppingCart, UserRound, Wallet as WalletIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CreateOrderRequest, EthNetwork, Quote, Wallet } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { useAuth } from '@/features/auth/auth-context'
import { cartQueryKey, getCart, getQuote, updateCartItem } from '@/features/cart/cart-api'
import { formatEth } from '@/shared/lib/eth'
import { createOrder, getWallets } from './checkout-api'

const networkOptions: { label: string; value: EthNetwork }[] = [
  { label: 'Ethereum', value: 'ethereum-mainnet' }, { label: 'Polygon', value: 'polygon' },
  { label: 'Arbitrum', value: 'arbitrum' }, { label: 'Optimism', value: 'optimism' }, { label: 'Base', value: 'base' },
]

export function CheckoutPage() {
  const { session, handleSessionExpired } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = session?.user.id
  const cartKey = cartQueryKey(userId)
  const cartQuery = useQuery({ queryKey: cartKey, queryFn: getCart, enabled: Boolean(userId), retry: false })
  const [network, setNetwork] = useState<EthNetwork>('ethereum-mainnet')
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [walletState,setWalletState]=useState<'disconnected'|'connecting'|'connected'|'declined'>('disconnected')
  const walletsQuery = useQuery({ queryKey: ['wallets', userId], queryFn: getWallets, enabled: Boolean(userId), retry: false })
  const quoteQuery = useQuery<Quote>({
    queryKey: ['cart-quote', userId ?? 'guest', cartQuery.data?.version, cartQuery.data?.couponCode, network],
    queryFn: () => getQuote({ network, couponCode: cartQuery.data?.couponCode }),
    enabled: Boolean(cartQuery.data?.items.length), retry: false,
  })
  const wallet = walletsQuery.data?.find((item) => item.id === selectedWalletId) ?? walletsQuery.data?.find((item) => item.role === 'primary') ?? walletsQuery.data?.[0]
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [lastAttempt, setLastAttempt] = useState<{ fingerprint: string; key: string } | null>(null)
const acceptPricesMutation=useMutation({mutationFn:async()=>{let latest=cartQuery.data!;for(const item of cartQuery.data!.items)latest=await updateCartItem(item.nftId,item.editionId,{quantity:item.quantity});return latest},onSuccess:async cart=>{queryClient.setQueryData(cartKey,cart);await queryClient.invalidateQueries({queryKey:['cart-quote',userId]})}})

  const orderMutation = useMutation({
    mutationFn: ({ input, key }: { input: CreateOrderRequest; key: string }) => createOrder(input, key),
    onSuccess: async (order) => {
      queryClient.setQueryData(['orders', userId, order.id], order)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartKey }),
        queryClient.invalidateQueries({ queryKey: ['cart-quote', userId] }),
        queryClient.invalidateQueries({ queryKey: ['orders', userId] }),
      ])
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      if (error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(error.code)) handleSessionExpired(error.code === 'SESSION_EXPIRED')
      setSubmissionError(error instanceof ApiError ? error.message : 'NÃ£o foi possÃ­vel enviar o pedido. Tente novamente.')
    },
  })

  useEffect(() => {
    if (walletsQuery.data?.length && !selectedWalletId) setSelectedWalletId((walletsQuery.data.find((item) => item.role === 'primary') ?? walletsQuery.data[0])!.id)
  }, [selectedWalletId, walletsQuery.data])

  const checkoutInput = useMemo(() => {
    if (!quoteQuery.data || !wallet || !session) return null
    return {
      quoteId: quoteQuery.data.id,
      acceptedTotal: quoteQuery.data.total,
      walletId: wallet.id,
      network,
      buyer: { displayName: session.user.displayName, email: session.user.email },
    } satisfies CreateOrderRequest
  }, [network, quoteQuery.data, session, wallet])

  function submitOrder() {
    if (!checkoutInput || orderMutation.isPending) return
    setSubmissionError(null)
    const fingerprint = JSON.stringify(checkoutInput)
    const key = lastAttempt?.fingerprint === fingerprint ? lastAttempt.key : `kurio-order-${crypto.randomUUID()}`
    setLastAttempt({ fingerprint, key })
    orderMutation.mutate({ input: checkoutInput, key })
  }


  const quote = quoteQuery.data
  const unavailable = quote?.issues.some((issue) => issue.type === 'UNAVAILABLE') ?? false
  const priceChanged = quote?.issues.some((issue) => issue.type === 'PRICE_CHANGED') ?? false
  const expiredSession = (error: unknown) => error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(error.code)

  return <main className="checkout-shell"><div className="checkout-page">
    <header className="desktop-header checkout-header"><Link className="wordmark" to="/">KURIO</Link><nav className="desktop-nav" aria-label="NavegaÃ§Ã£o principal"><Link to="/">InÃ­cio</Link><a href="/#catalog">Mercado</a></nav><span className="checkout-header-user">{session?.user.displayName}</span></header>
    <header className="checkout-mobile-header"><Link to="/cart" aria-label="Voltar ao carrinho"><ArrowLeft /></Link><Link className="wordmark" to="/">KURIO</Link><span>Checkout</span></header>
    <div className="checkout-breadcrumb"><Link to="/cart">Carrinho</Link><span>/</span><strong>Checkout</strong></div>
    <div className="checkout-title"><p className="checkout-eyebrow">QUASE SEU</p><h1>Finalizar pedido</h1><p>Confira os itens, a carteira e os valores antes de enviar.</p></div>

    {cartQuery.isPending || walletsQuery.isPending ? <CheckoutSkeleton />
      : cartQuery.error || walletsQuery.error ? <section className="checkout-state" role="alert"><h2>NÃ£o foi possÃ­vel preparar o checkout</h2><p>{(cartQuery.error ?? walletsQuery.error) instanceof ApiError ? (cartQuery.error ?? walletsQuery.error as ApiError).message : 'Tente novamente em instantes.'}</p><button onClick={() => { void cartQuery.refetch(); void walletsQuery.refetch() }}>Tentar novamente</button></section>
        : !cartQuery.data?.items.length ? <section className="checkout-state checkout-empty"><ShoppingCart /><h2>Seu carrinho estÃ¡ vazio</h2><p>Adicione uma ediÃ§Ã£o ao carrinho para iniciar um pedido.</p><Link className="checkout-primary-link" to="/">Explorar o mercado</Link></section>
          : <div className="checkout-layout">
            <section className="checkout-main-column">
              <section className="checkout-card checkout-items"><div className="checkout-section-heading"><span>01</span><div><h2>Seu pedido</h2><p>{cartQuery.data.items.length} {cartQuery.data.items.length === 1 ? 'ediÃ§Ã£o' : 'ediÃ§Ãµes'} no carrinho</p></div><Link to="/cart">Editar carrinho</Link></div>
                {cartQuery.data.items.map((item) => <article className="checkout-line" key={`${item.nftId}:${item.editionId}`}><img src={item.imageUrl} alt={item.imageAlt} /><div className="checkout-line-info"><strong>{item.name}</strong><span>{item.editionLabel} Â· {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}</span></div><b>{formatEth(item.unitPrice)}</b></article>)}
              </section>
              <section className="checkout-card"><div className="checkout-section-heading"><span>02</span><div><h2>Carteira de recebimento</h2><p>O pedido ficarÃ¡ pendente; nenhuma transaÃ§Ã£o serÃ¡ enviada.</p></div></div>
                {walletsQuery.data?.length ? <><label className="checkout-field">Carteira<select value={wallet?.id ?? ''} onChange={(event) => setSelectedWalletId(event.target.value)}>{walletsQuery.data.map((item: Wallet) => <option value={item.id} key={item.id}>{item.label} Â· {item.address.slice(0, 6)}â€¦{item.address.slice(-4)} Â· {item.network}</option>)}</select></label>                <div className="wallet-simulation"><p role="status">Carteira simulada: {walletState==='connected'?'conectada':walletState==='connecting'?'conectando':walletState==='declined'?'conexão recusada':'desconectada'}</p><button type="button" onClick={()=>{setWalletState('connecting');window.setTimeout(()=>setWalletState('connected'),250)}} disabled={walletState==='connecting'}>Simular conexão</button><button type="button" onClick={()=>setWalletState('declined')}>Simular recusa</button><button type="button" onClick={()=>setWalletState('disconnected')}>Desconectar</button><small>Somente demonstração; nenhuma carteira real é acessada.</small></div></>
                  : <div className="checkout-wallet-empty"><WalletIcon /><div><strong>Nenhuma carteira cadastrada</strong><p>Adicione uma carteira fictÃ­cia para associÃ¡-la ao pedido.</p></div></div>}
                <Link className="checkout-secondary-button" to="/wallets"><WalletIcon />{walletsQuery.data?.length ? 'Gerenciar carteiras' : 'Adicionar carteira de demonstração'}</Link>
              </section>
              <section className="checkout-card"><div className="checkout-section-heading"><span>03</span><div><h2>Rede e cotaÃ§Ã£o</h2><p>O servidor valida novamente estoque e valores ao enviar.</p></div></div>
                <label className="checkout-field">Rede<select value={network} onChange={(event) => setNetwork(event.target.value as EthNetwork)}>{networkOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                {quoteQuery.isPending ? <div className="checkout-quote-skeleton" aria-label="Atualizando cotaÃ§Ã£o"><i /><i /><i /></div> : quoteQuery.error ? <div className="checkout-inline-error" role="alert">NÃ£o foi possÃ­vel atualizar a cotaÃ§Ã£o. <button onClick={() => void quoteQuery.refetch()}>Tentar novamente</button></div> : <>{quote?.issues.map((issue,index)=><p className="checkout-inline-error" role="alert" key={`${issue.type}-${index}`}>{issue.type==='UNAVAILABLE'?`Estoque alterado: restam ${issue.available} unidades nesta edição.`:issue.type==='PRICE_CHANGED'?'O preço foi atualizado. Confira os valores recalculados.':issue.type==='COUPON_EXPIRED'?`O cupom ${issue.code} expirou.`:`O cupom ${issue.code} não é válido.`}</p>)}{priceChanged&&<button className="checkout-secondary-button" disabled={acceptPricesMutation.isPending} onClick={()=>acceptPricesMutation.mutate()}><RefreshCw />{acceptPricesMutation.isPending?'Atualizando valores…':'Aceitar novos preços e recalcular'}</button>}</>}
              </section>
            </section>
            <aside className="checkout-summary"><p className="checkout-eyebrow">RESUMO</p><h2>Totais do pedido</h2>{quoteQuery.isPending ? <div className="checkout-quote-skeleton"><i /><i /><i /></div> : quote && <><div className="checkout-summary-row"><span>Subtotal</span><strong>{formatEth(quote.subtotal)}</strong></div><div className="checkout-summary-row checkout-discount"><span>Desconto</span><strong>âˆ’ {formatEth(quote.discount)}</strong></div><div className="checkout-summary-row"><span>Taxa de rede</span><strong>{formatEth(quote.networkFee)}</strong></div><div className="checkout-summary-total"><span>Total</span><strong>{formatEth(quote.total)}</strong></div></>}
              {submissionError && <p className="checkout-inline-error" role="alert">{submissionError}</p>}
              {expiredSession(orderMutation.error) && <p className="checkout-inline-error" role="alert">Sua sessÃ£o expirou. Entre novamente para continuar.</p>}
              <button className="checkout-submit" onClick={submitOrder} disabled={orderMutation.isPending || acceptPricesMutation.isPending || !wallet || !quote || quoteQuery.isPending || unavailable || priceChanged || !cartQuery.data?.items.length}>{orderMutation.isPending ? 'Enviando pedidoâ€¦' : <><Check /> Confirmar pedido</>}</button>
              <p className="checkout-disclaimer"><CreditCard /> Nenhum pagamento ou transaÃ§Ã£o blockchain serÃ¡ realizado. O pedido serÃ¡ criado como pendente.</p>
              <Link className="checkout-back-link" to="/cart"><ArrowLeft /> Voltar ao carrinho</Link>
            </aside>
          </div>}
  </div><nav className="mobile-tabbar checkout-tabbar" aria-label="NavegaÃ§Ã£o mobile"><Link to="/" aria-label="InÃ­cio"><Home /></Link><Link to="/favorites" aria-label="Favoritos"><Heart /></Link><span className="tabbar-center"><Menu /></span><Link to="/cart" aria-label="Carrinho"><ShoppingCart /></Link><Link to="/favorites" aria-label="Conta"><UserRound /></Link></nav></main>
}

function CheckoutSkeleton() { return <div className="checkout-layout" aria-label="Carregando checkout"><div className="checkout-main-column"><div className="checkout-skeleton-card" /><div className="checkout-skeleton-card" /><div className="checkout-skeleton-card" /></div><div className="checkout-skeleton-summary" /></div> }
