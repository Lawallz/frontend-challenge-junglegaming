import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
    </main>
  ),
})
