/**
 * Ativa o MSW por configuração (VITE_ENABLE_MOCKS), inclusive no build de demonstração.
 * O import dinâmico mantém o MSW fora do bundle quando os mocks estão desligados.
 */
export async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const [{ worker }] = await Promise.all([
    import('./browser'),
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}mockServiceWorker.js`),
  ])
  await worker.start({
    // Verbose request/response inspection is useful in dev, costly in production.
    quiet: import.meta.env.PROD,
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
