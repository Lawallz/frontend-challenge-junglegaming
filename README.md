# NFT Marketplace

Solução do desafio frontend (React + TypeScript + TanStack Router/Query + Axios + MSW + Socket.IO + Tailwind + shadcn/ui + Playwright + Lighthouse).

> Status: implementação de catálogo, autenticação, favoritos, carrinho, checkout, pedidos, perfil e carteiras de demonstração.

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

## Cenarios de carrinho

- VITE_MOCK_SCENARIO=cart-resilience adiciona 900 ms de latencia as operacoes de carrinho e cotacao; cart-failure retorna 503 nesses endpoints.
- KURIO10 aplica 10% de desconto; KURIOEXPIRED exercita cupom expirado. Outros codigos sao invalidos.

## Perfil e carteiras

- Acesse Perfil, Pedidos e Carteiras ap�s entrar. O perfil permite editar nome de exibi��o, usu�rio, e-mail e ENS.
- Pedidos e carteiras s�o mocks MSW isolados pelo ID da conta autenticada; o checkout seleciona por padr�o a carteira marcada como principal.
- Cen�rios reproduz�veis adicionais: `VITE_MOCK_SCENARIO=account-resilience` aplica lat�ncia �s opera��es da conta e `account-failure` retorna falha transit�ria.
- Carteiras s�o apenas registros de demonstra��o; n�o h� conex�o real nem transa��es.

- Perfil e carteiras foram implementados com os tokens Kurio existentes. Não houve comparação visual direta com os frames do Figma nesta etapa.

## Tempo real e pagamento simulado

- O transporte usa `socket.io-client` com `ws.link` do MSW e `@mswjs/socket.io-binding`; os eventos só são emitidos após `subscribe` para o recurso.
- `realtime-price-update` altera o preço de `nft-005`; `realtime-edition-soldout` esgota as edições; `realtime-latency` atrasa a atualização de NFT.
- `realtime-order-pending` mantém o pedido pendente e confirma após 2 s; `realtime-order-confirmed` confirma imediatamente; `realtime-order-declined` recusa; `realtime-order-duplicate` repete e envia um evento antigo; `realtime-disconnect` interrompe a primeira conexão de pedido e confirma após reconectar.
- Para ativar: defina `VITE_MOCK_SCENARIO` antes de `npm run dev:mocks`/`npm run build:demo`, ou grave o nome em `localStorage['kurio:mock:scenario']`. Para resetar, remova a chave (ou defina `catalog-default`) e recarregue a página. `setMockScenario`/`resetMockScenario` também estão disponíveis em testes.
- Eventos têm `eventId`, recurso, versão e audiência; atualizações privadas de pedido são filtradas por usuário. Na reconexão, recursos ativos são reconciliados por REST. A cotação REST continua autoritativa e o novo preço exige aceitação explícita antes do checkout.
- Limitação: `@mswjs/socket.io-binding` implementa a ponte pelo WebSocket MSW, sem servidor Socket.IO real, namespaces/salas ou garantias de transporte de produção. Carteiras e pagamento permanecem simulações.
