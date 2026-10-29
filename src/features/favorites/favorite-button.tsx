import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { safeInternalReturnTo } from '@/features/auth/session'
import { ApiError } from '@/shared/api/errors'
import { addFavorite, getFavorites, removeFavorite } from './favorites-api'

interface Props {
  nftId: string
  returnTo?: string
  className?: string
  size?: number
  showLabel?: boolean
}

export function FavoriteButton({ nftId, returnTo, className = '', size = 17, showLabel = false }: Props) {
  const { session, isLoading, handleSessionExpired } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const queryKey = ['favorites', session?.user.id]
  const favoritesQuery = useQuery({
    queryKey,
    queryFn: getFavorites,
    enabled: Boolean(session),
    staleTime: 30_000,
  })
  const isFavorite = favoritesQuery.data?.some((favorite) => favorite.nftId === nftId) ?? false
  const mutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) await removeFavorite(nftId)
      else await addFavorite(nftId)
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => {
      if (error instanceof ApiError && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(error.code)) handleSessionExpired(error.code === 'SESSION_EXPIRED')
    },
  })
  const safeTarget = safeInternalReturnTo(returnTo ?? `${location.pathname}${location.searchStr}${location.hash ? `#${location.hash}` : ''}`)
  const label = isFavorite ? `Remover ${nftId} dos favoritos` : `Adicionar ${nftId} aos favoritos`

  if (isLoading) return <button className={className} type="button" disabled aria-label="Verificando sessão"><Heart size={size} /></button>
  if (!session) {
    return <Link className={className} to="/login" search={{ returnTo: safeTarget, reason: undefined }} aria-label={showLabel ? "Favoritar: entre para adicionar aos favoritos" : "Entre para adicionar aos favoritos"}><Heart size={size} />{showLabel && <span>Favoritar</span>}</Link>
  }

  return <button className={`${className} ${isFavorite ? 'is-favorite' : ''}`} type="button" aria-label={showLabel ? `${isFavorite ? 'Salvo' : 'Favoritar'}: ${label}` : label} aria-pressed={isFavorite} disabled={favoritesQuery.isPending || mutation.isPending} onClick={() => mutation.mutate()}><Heart size={size} fill={isFavorite ? 'currentColor' : 'none'} />{showLabel && <span>{isFavorite ? 'Salvo' : 'Favoritar'}</span>}</button>
}
