# NFT Marketplace

Solução do desafio frontend (React + TypeScript + TanStack Router/Query + Axios + MSW + Socket.IO + Tailwind + shadcn/ui + Playwright + Lighthouse).

> Status: **etapa 3 concluída** (contratos de catálogo, fixtures e handlers MSW de catálogo/detalhe). A interface entra nas próximas etapas.

## Setup

```bash
npm install
cp .env.example .env
npx playwright install chromium   # necessário só para os testes E2E
```

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_ENABLE_MOCKS` | `true` ativa o MSW (também no build de demonstração) |
| `VITE_API_BASE_URL` | Prefixo das chamadas REST (padrão `/api`) |
| `VITE_SOCKET_URL` | Origem do Socket.IO simulado |
| `VITE_MOCK_SCENARIO` | `catalog-default` (padrão), `catalog-resilience` ou `catalog-failure` |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev:mocks` | Desenvolvimento com mocks (via `cross-env`, funciona em Windows/macOS/Linux) |
| `npm run build:demo` | Build com mocks ligados |
| `npm run preview` | Serve o build |
| `npm run typecheck` | Gera a route tree e checa tipos |
| `npm run lint` | oxlint |
| `npm run test:unit` | Vitest (lógica pura, contratos de query e handlers de catálogo) |
| `npm run test:e2e` | Playwright (build de demonstração + preview) |

## Cenários MSW (etapa 3)

- `catalog-default`: catálogo local determinístico, sem latência ou falha.
- `catalog-resilience`: mesma resposta com 350 ms de latência para exercitar estados de carregamento.
- `catalog-failure`: responde `503 TRANSIENT_FAILURE` no catálogo e detalhe para exercitar o estado de erro.
- Seletor: defina `VITE_MOCK_SCENARIO` antes de `npm run dev:mocks` ou `npm run build:demo`. Para reset, remova a variável ou volte a `catalog-default` e reinicie o servidor/build; o cenário é imutável durante uma sessão.
- Em código de demonstração/teste, `setMockScenario(name)` troca o cenário; `resetMockScenario()` limpa a substituição e retorna à configuração de ambiente (ou ao padrão).

As imagens são SVGs determinísticos servidos pelo próprio MSW em `/nft-art/:id.svg`, sem URLs temporárias externas.
