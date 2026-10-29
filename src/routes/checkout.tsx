import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/features/auth/auth-routing'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/checkout')({ beforeLoad: requireSession, component: CheckoutPage })
