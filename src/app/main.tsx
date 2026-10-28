import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { enableMocks } from '@/mocks/enable-mocks'
import { AppProviders } from './providers'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'
import './styles/globals.css'

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

// Os mocks precisam estar prontos antes da primeira requisição.
enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders queryClient={queryClient} router={router} />
    </StrictMode>,
  )
})
