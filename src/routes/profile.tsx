import {createFileRoute} from '@tanstack/react-router'
import {requireSession} from '@/features/auth/auth-routing'
import {ProfilePage} from '@/features/account/account-pages'
export const Route=createFileRoute('/profile')({beforeLoad:requireSession,component:ProfilePage})