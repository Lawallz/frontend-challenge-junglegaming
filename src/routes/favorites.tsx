import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/favorites/favorites-page'
import { requireSession } from '@/features/auth/auth-routing'

export const Route = createFileRoute('/favorites')({
  beforeLoad: requireSession,
  component: FavoritesPage,
})
