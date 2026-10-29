import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider } from '@/features/auth/auth-context'
import type { createAppRouter } from './router'
import { RealtimeSync } from '@/features/checkout/realtime-sync'

interface Props {
  queryClient: QueryClient
  router: ReturnType<typeof createAppRouter>
}

export function AppProviders({ queryClient, router }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeSync />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
