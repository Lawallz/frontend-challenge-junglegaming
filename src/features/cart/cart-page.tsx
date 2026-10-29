import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Heart, Home, Menu, Minus, Plus, ShoppingBag, ShoppingCart, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Cart, CartItem, EthNetwork, Quote } from '@/shared/api/contracts'
import { ApiError } from '@/shared/api/errors'
import { useAuth } from '@/features/auth/auth-context'
import { formatEth, mulEthByQuantity } from '@/shared/lib/eth'
import { applyCartCoupon, cartQueryKey, getCart, getQuote, removeCartCoupon, removeCartItem, updateCartItem } from './cart-api'

const networks: { label: string; value: EthNetwork }[] = [
  { label: 'Ethereum', value: 'ethereum-mainnet' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Arbitrum', value: 'arbitrum' },
  { label: 'Optimism', value: 'optimism' },
  { label: 'Base', value: 'base' },
]

function updateQuantity(cart: Cart, item: CartItem, quantity: number): Cart {
  return { ...cart, items: cart.items.map((current) => current.nftId === item.nftId && current.editionId === item.editionId ? { ...current, quantity } : current), version: cart.version + 1 }
}

function removeLine(cart: Cart, item: CartItem): Cart {
  return { ...cart, items: cart.items.filter((current) => current.nftId !== item.nftId || current.editionId !== item.editionId), version: cart.version + 1 }
}

export function CartPage() {
  const { session, isLoading: isSessionLoading, handleSessionExpired } = useAuth()
  const queryClient = useQueryClient()
  const key = cartQueryKey(session?.user.id)
  const [couponInput, setCouponInput] = useState('')
  const [network, setNetwork] = useState<EthNetwork>('ethereum-mainnet')
  const cartQuery = useQuery({ queryKey: key, queryFn: getCart, enabled: !isSessionLoading, retry: false })
  const cart = cartQuery.data
  const quoteQuery = useQuery<Quote>({
    queryKey: ['cart-quote', session?.user.id ?? 'guest', cart?.version, cart?.couponCode, network],
    queryFn: () => getQuote({ network, couponCode: cart?.couponCode }),
    enabled: Boolean(cart && cart.items.length > 0),
    retry: false,
  })

  const optimisticOptions = {
    onMutate: async (variables: { item: CartItem; quantity?: number; remove?: boolean }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) queryClient.setQueryData(key, variables.remove ? removeLine(previous, variables.item) : updateQuantity(previous, variables.item, variables.quantity!))
      return { previous }
    },
    onError: (_error: Error, _variables: unknown, context: { previous?: Cart } | undefined) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (next: Cart) => queryClient.setQueryData(key, next),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['cart-quote', session?.user.id ?? 'guest'] }) },
  }
  const quantityMutation = useMutation({
    mutationFn: ({ item, quantity }: { item: CartItem; quantity: number }) => updateCartItem(item.nftId, item.editionId, { quantity }),
    ...optimisticOptions,
  })
  const removeMutation = useMutation({
    mutationFn: ({ item }: { item: CartItem; remove?: boolean }) => removeCartItem(item.nftId, item.editionId),
    ...optimisticOptions,
  })
  const couponMutation = useMutation({
    mutationFn: applyCartCoupon,
    onMutate: async ({ code }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) queryClient.setQueryData<Cart>(key, { ...previous, couponCode: code.trim().toUpperCase(), version: previous.version + 1 })
      return { previous }
    },
    onError: (_error, _variables, context) => { if (context?.previous) queryClient.setQueryData(key, context.previous) },
    onSuccess: (next) => { queryClient.setQueryData(key, next); setCouponInput('') },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['cart-quote', session?.user.id ?? 'guest'] }) },
  })
  const clearCouponMutation = useMutation({
    mutationFn: removeCartCoupon,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) queryClient.setQueryData<Cart>(key, { ...previous, couponCode: null, version: previous.version + 1 })
      return { previous }
    },
    onError: (_error, _variables, context) => { if (context?.previous) queryClient.setQueryData(key, context.previous) },
    onSuccess: (next) => queryClient.setQueryData(key, next),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['cart-quote', session?.user.id ?? 'guest'] }) },
  })

  useEffect(() => {
    const errors = [cartQuery.error, quantityMutation.error, removeMutation.error, couponMutation.error, clearCouponMutation.error]
    const expired = errors.find((error) => error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(error.code))
    if (expired) handleSessionExpired(expired instanceof ApiError && expired.code === 'SESSION_EXPIRED')
  }, [cartQuery.error, clearCouponMutation.error, couponMutation.error, handleSessionExpired, quantityMutation.error, removeMutation.error])

  function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!couponInput.trim()) return
    couponMutation.reset()
    couponMutation.mutate({ code: couponInput })
  }

  const totalQuantity = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
  const activeError = [cartQuery.error, quantityMutation.error, removeMutation.error, clearCouponMutation.error].find(Boolean)
  const quoteError = quoteQuery.error

  return (
    <main className="cart-shell">
      <div className="cart-page">
        <header className="desktop-header cart-desktop-header">
          <Link className="wordmark" to="/">KURIO</Link>
          <nav className="desktop-nav" aria-label="Navegação principal"><Link to="/">Início</Link><a href="/#catalog">Mercado</a></nav>
          <div className="header-actions"><Link className="cart-account-link" to={session ? '/favorites' : '/login'}>{session?.user.displayName ?? 'Entrar'}</Link></div>
        </header>
        <header className="cart-mobile-header"><Link to="/" aria-label="Voltar ao mercado"><ArrowLeft /></Link><Link className="wordmark" to="/">KURIO</Link><span>{totalQuantity} itens</span></header>

        <div className="cart-breadcrumb"><Link to="/">Mercado</Link><span>/</span><span>Carrinho</span></div>
        <div className="cart-heading"><div><p className="cart-eyebrow">SUA PRÓXIMA DESCOBERTA</p><h1>Seu carrinho <span>({totalQuantity})</span></h1><p>Revise suas edições antes de continuar.</p></div><Link to="/" className="cart-continue"><ArrowLeft /> Continuar explorando</Link></div>

        {isSessionLoading || cartQuery.isPending ? <CartSkeleton />
          : cartQuery.error ? <section className="cart-state cart-error" role="alert"><h2>Não foi possível carregar o carrinho</h2><p>{cartQuery.error instanceof ApiError ? cartQuery.error.message : 'Tente novamente em instantes.'}</p><button onClick={() => void cartQuery.refetch()}>Tentar novamente</button></section>
            : !cart?.items.length ? <section className="cart-state cart-empty"><span className="cart-empty-mark"><ShoppingBag /></span><p className="cart-eyebrow">ESPAÇO PARA SUA PRÓXIMA PEÇA</p><h2>Seu carrinho está vazio</h2><p>Explore o mercado e encontre algo que tenha a sua cara.</p><Link to="/" className="cart-primary-link">Explorar NFTs</Link></section>
              : <div className="cart-layout">
                <section className="cart-items-column" aria-label="Itens do carrinho">
                  <div className="cart-list-heading"><span>PEÇA</span><span>PREÇO</span><span>QUANTIDADE</span><span>TOTAL</span></div>
                  {cart.items.map((item) => <article className="cart-item" key={`${item.nftId}:${item.editionId}`}>
                    <Link className="cart-item-art" to="/nft/$nftId" params={{ nftId: item.nftId }}><img src={item.imageUrl} alt={item.imageAlt} /></Link>
                    <div className="cart-item-details"><span className="cart-collection">Kurio · Edição</span><Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="cart-item-title">{item.name} <small>{item.tokenId}</small></Link><span className="cart-edition">{item.editionLabel} · {item.available} disponíveis</span><button className="cart-mobile-remove" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate({ item, remove: true })}><Trash2 /> Remover</button></div>
                    <span className="cart-unit-price">{formatEth(item.unitPrice)}</span>
                    <div className="cart-quantity" aria-label={`Quantidade de ${item.name}`}><button aria-label={`Diminuir ${item.name}`} disabled={item.quantity <= 1 || quantityMutation.isPending} onClick={() => quantityMutation.mutate({ item, quantity: item.quantity - 1 })}><Minus /></button><output aria-label="Quantidade">{item.quantity}</output><button aria-label={`Aumentar ${item.name}`} disabled={item.quantity >= item.available || quantityMutation.isPending} onClick={() => quantityMutation.mutate({ item, quantity: item.quantity + 1 })}><Plus /></button></div>
                    <strong className="cart-line-total">{formatEth(mulEthByQuantity(item.unitPrice, item.quantity))}</strong>
                    <button className="cart-remove" aria-label={`Remover ${item.name}`} disabled={removeMutation.isPending} onClick={() => removeMutation.mutate({ item, remove: true })}><Trash2 /></button>
                  </article>)}
                  {activeError && !(activeError instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(activeError.code)) && <p className="cart-inline-error" role="alert">{activeError instanceof ApiError ? activeError.message : 'Não foi possível atualizar o carrinho.'}</p>}
                  {(quantityMutation.isSuccess || removeMutation.isSuccess || couponMutation.isSuccess || clearCouponMutation.isSuccess) && <p className="cart-inline-success" role="status"><Check /> Carrinho atualizado.</p>}
                  <Link to="/" className="cart-back-link"><ArrowLeft /> Continuar comprando</Link>
                </section>

                <aside className="cart-summary" aria-label="Resumo do pedido">
                  <h2>Resumo do pedido</h2>
                  <form className="cart-coupon-form" onSubmit={submitCoupon}><label htmlFor="cart-coupon">Cupom de desconto</label><div><input id="cart-coupon" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Digite seu código" /><button disabled={couponMutation.isPending}>{couponMutation.isPending ? '…' : 'Aplicar'}</button></div></form>
                  {cart.couponCode && <div className="cart-coupon-applied"><span><Check /> Cupom {cart.couponCode}</span><button onClick={() => clearCouponMutation.mutate()} disabled={clearCouponMutation.isPending}>Remover</button></div>}
                  {couponMutation.error && <p className="cart-coupon-error" role="alert">{couponMutation.error instanceof ApiError ? couponMutation.error.message : 'Não foi possível validar o cupom.'}</p>}
                  <label className="cart-network-label" htmlFor="cart-network">Rede para a taxa</label><select id="cart-network" value={network} onChange={(event) => setNetwork(event.target.value as EthNetwork)}>{networks.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  {quoteQuery.isPending ? <QuoteSkeleton /> : quoteError ? <div className="cart-quote-error" role="alert"><p>Não foi possível atualizar a cotação.</p><button onClick={() => void quoteQuery.refetch()}>Tentar novamente</button></div> : quoteQuery.data && <>
                    <div className="cart-summary-row"><span>Subtotal</span><strong>{formatEth(quoteQuery.data.subtotal)}</strong></div>
                    <div className="cart-summary-row cart-discount"><span>Desconto</span><strong>− {formatEth(quoteQuery.data.discount)}</strong></div>
                    <div className="cart-summary-row"><span>Taxa de rede</span><strong>{formatEth(quoteQuery.data.networkFee)}</strong></div>
                    {quoteQuery.data.issues.map((issue, index) => <p className="cart-quote-warning" role="alert" key={`${issue.type}-${index}`}>{issue.type === 'UNAVAILABLE' ? `Estoque atualizado: apenas ${issue.available} unidades disponíveis.` : issue.type === 'PRICE_CHANGED' ? 'O preço desta peça foi atualizado. Revise a cotação antes de continuar.' : issue.type === 'COUPON_EXPIRED' ? `O cupom ${issue.code} expirou.` : `O cupom ${issue.code} é inválido.`}</p>)}
                    <div className="cart-summary-total"><span>Total estimado</span><strong>{formatEth(quoteQuery.data.total)}</strong></div>
                  </>}
                  <Link className="cart-checkout-button" to="/checkout" aria-disabled={!quoteQuery.data || quoteQuery.isPending || quoteQuery.data.issues.some((issue) => issue.type === 'UNAVAILABLE')}>Continuar para checkout</Link>
                  <p className="cart-checkout-note">O pedido será registrado como pendente. Nenhum pagamento será processado.</p>
                </aside>
              </div>}
      </div>
      <nav className="mobile-tabbar cart-mobile-tabbar" aria-label="Navegação mobile"><Link to="/" aria-label="Início"><Home /></Link><Link to="/favorites" aria-label="Favoritos"><Heart /></Link><span className="tabbar-center"><Menu /></span><Link className="tabbar-active" to="/cart" aria-label="Carrinho"><ShoppingCart /></Link><Link to={session ? '/favorites' : '/login'} aria-label="Conta"><UserRound /></Link></nav>
    </main>
  )
}

function CartSkeleton() {
  return <div className="cart-skeleton" aria-label="Carregando carrinho"><div className="cart-skeleton-lines">{Array.from({ length: 3 }, (_, index) => <div className="cart-skeleton-item" key={index}><span /><div><i /><i /></div><b /></div>)}</div><div className="cart-skeleton-summary"><i /><i /><i /><b /></div></div>
}

function QuoteSkeleton() {
  return <div className="quote-skeleton" aria-label="Calculando cotação"><i /><i /><i /></div>
}
