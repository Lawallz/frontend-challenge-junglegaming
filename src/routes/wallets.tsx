import {createFileRoute} from '@tanstack/react-router'
import {requireSession} from '@/features/auth/auth-routing'
import {WalletsPage} from '@/features/account/account-pages'
export const Route=createFileRoute('/wallets')({beforeLoad:requireSession,component:WalletsPage})