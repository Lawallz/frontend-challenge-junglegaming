import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Home, Heart, Menu, ShoppingCart, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/shared/api/errors'
import { formatEth } from '@/shared/lib/eth'
import { getOrder } from './checkout-api'
import { Route } from '@/routes/orders.$orderId'

export function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  const { session, handleSessionExpired } = useAuth()
  const orderQuery = useQuery({ queryKey: ['orders', session?.user.id, orderId], queryFn: () => getOrder(orderId), enabled: Boolean(session?.user.id), retry: false })
  useEffect(() => {
    if (orderQuery.error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(orderQuery.error.code)) handleSessionExpired(orderQuery.error.code === 'SESSION_EXPIRED')
  }, [handleSessionExpired, orderQuery.error])
  const order = orderQuery.data

  return <main className="checkout-shell"><div className="checkout-page">
    <header className="desktop-header checkout-header"><Link className="wordmark" to="/">KURIO</Link><nav className="desktop-nav" aria-label="NavegaÃ§Ã£o principal"><Link to="/">InÃ­cio</Link><a href="/#catalog">Mercado</a></nav><span className="checkout-header-user">{session?.user.displayName}</span></header>
    <header className="checkout-mobile-header"><Link to="/" aria-label="Voltar ao mercado"><ArrowLeft /></Link><Link className="wordmark" to="/">KURIO</Link><span>Pedido</span></header>
    {orderQuery.isPending ? <div className="order-confirmation-skeleton" aria-label="Carregando pedido"><i /><i /><i /></div>
      : orderQuery.error ? <section className="checkout-state" role="alert"><h1>{orderQuery.error instanceof ApiError && orderQuery.error.code === 'NOT_FOUND' ? 'Pedido nÃ£o encontrado' : 'NÃ£o foi possÃ­vel carregar o pedido'}</h1><p>{orderQuery.error instanceof ApiError ? orderQuery.error.message : 'Tente novamente em instantes.'}</p><button onClick={() => void orderQuery.refetch()}>Tentar novamente</button><Link className="checkout-primary-link" to="/">Voltar ao mercado</Link></section>
        : order && <section className="order-receipt"><div className="order-receipt-mark"><Check /></div><p className="checkout-eyebrow">PEDIDO REGISTRADO</p><h1>Seu pedido foi recebido</h1><p className="order-receipt-intro">O pedido foi criado no ambiente de demonstraÃ§Ã£o. Nenhum pagamento foi processado.</p><div className="order-number"><span>NÃšMERO DO PEDIDO</span><strong>{order.id}</strong></div><div className="order-status"><span>Estado</span><strong>{order.status === 'pending' ? 'Pendente' : order.status === 'confirmed' ? 'Confirmado' : 'Recusado'}</strong><p>Este pedido nÃ£o representa uma transaÃ§Ã£o financeira ou blockchain.</p></div>
          <section className="order-receipt-items"><h2>Itens do pedido</h2>{order.snapshot.lines.map((item) => <article className="checkout-line" key={`${item.nftId}:${item.editionId}`}><img src={item.imageUrl} alt={item.imageAlt} /><div className="checkout-line-info"><strong>{item.name}</strong><span>{item.editionLabel} Â· {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}</span></div><b>{formatEth(item.lineTotal)}</b></article>)}</section>
          <section className="order-receipt-summary"><h2>Resumo</h2><div className="checkout-summary-row"><span>Subtotal</span><strong>{formatEth(order.snapshot.subtotal)}</strong></div><div className="checkout-summary-row checkout-discount"><span>Desconto</span><strong>âˆ’ {formatEth(order.snapshot.discount)}</strong></div><div className="checkout-summary-row"><span>Taxa de rede Â· {order.snapshot.network}</span><strong>{formatEth(order.snapshot.networkFee)}</strong></div><div className="checkout-summary-total"><span>Total</span><strong>{formatEth(order.snapshot.total)}</strong></div><p>Carteira associada: {order.snapshot.wallet.label} Â· {order.snapshot.wallet.address.slice(0, 8)}â€¦{order.snapshot.wallet.address.slice(-4)}</p></section><Link className="checkout-primary-link" to="/">Voltar ao mercado</Link>
        </section>}
  </div><nav className="mobile-tabbar checkout-tabbar" aria-label="NavegaÃ§Ã£o mobile"><Link to="/" aria-label="InÃ­cio"><Home /></Link><Link to="/favorites" aria-label="Favoritos"><Heart /></Link><span className="tabbar-center"><Menu /></span><Link to="/cart" aria-label="Carrinho"><ShoppingCart /></Link><Link to="/favorites" aria-label="Conta"><UserRound /></Link></nav></main>
}
