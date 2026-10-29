import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './providers'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

export function renderApp() {
  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)
  createRoot(document.getElementById('root')!).render(
    <StrictMode><AppProviders queryClient={queryClient} router={router} /></StrictMode>,
  )
}
