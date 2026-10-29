import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/features/auth/auth-routing'
import { OrderConfirmationPage } from '@/features/checkout/order-confirmation-page'

export const Route = createFileRoute('/orders/$orderId')({ beforeLoad: requireSession, component: OrderConfirmationPage })
