import {createFileRoute} from '@tanstack/react-router'
import {requireSession} from '@/features/auth/auth-routing'
import {OrdersPage} from '@/features/account/account-pages'
export const Route=createFileRoute('/orders/')({beforeLoad:requireSession,component:OrdersPage})