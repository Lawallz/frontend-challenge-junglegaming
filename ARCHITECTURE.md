# Arquitetura

## Estrutura

- `src/app`: providers, router, query client, estilos globais, `routeTree.gen.ts` (gerado).
- `src/routes`: páginas e rotas (TanStack Router, file-based).
- `src/features/*`: catalog, nft-detail, favorites, cart, checkout, orders, auth, profile, wallets.
- `src/shared/api`: cliente Axios, `ApiError` e contratos tipados em `contracts/`.
- `src/shared/ui`: componentes compartilhados (shadcn/ui, alias `@/shared/ui`).
- `src/shared/lib`: `cn` e `eth.ts` (valores ETH com `decimal.js`).
- `src/mocks`: MSW (handlers REST e Socket.IO, fixtures, cenários, reset).
- `src/test`: E2E e regressão visual (Playwright). Testes unitários ficam ao lado do código (`*.test.ts`, Vitest).

## Figma

- Arquivo de trabalho (cópia): `q7XaNi2aVhxCNnq8oNq55G`, página `0:1`.
  Protótipo: https://www.figma.com/proto/q7XaNi2aVhxCNnq8oNq55G/Frontend-Challenge--c%C3%B3pia-?node-id=0-1&t=oMJEwHdCPs9Zoq0r-1
- O acesso funciona pelo conector do Figma (`get_metadata`). A tentativa anterior via `web_fetch` falhava por `ROBOTS_DISALLOWED`; isso não bloqueia mais o trabalho.
- **Verificado (estrutura e textos, via `get_metadata`):** 15 frames. Desktop (1440): Início `2:2`, Detalhes do NFT `10:244`, Carrinho `11:1278`, Pagamento `11:2862`, Confirmação de Pedido `11:4385`, Login `9:115`, Cadastro `9:1022`, Perfil do Colecionador `9:1238`, Carteiras `9:1670`. Mobile (414): Início `14:5226`, Detalhes `15:5536`, Carrinho `16:360`, Pagamento `16:748`, Login `16:1022`, Cadastro `16:1228`.
- Não há frame mobile de Perfil, Carteiras e Confirmação (previsto no README: devem funcionar em mobile mesmo assim).
- Confere com o descrito: catálogo desktop com sidebar de filtros (`Filters`, nó `70485:382`) e grade de 3 colunas; mobile com busca + filtro no topo, grade de 2 colunas e `Tab Bar` fixa; detalhe com galeria e informações lado a lado.
- **Ainda não verificado por mim:** cores, tipografia, espaçamentos e assets (descritos como fundo quase preto, superfícies marrons, laranja queimado, tipografia de aparência monoespaçada). `get_metadata` não retorna estilos. Os tokens de `globals.css` continuam neutros até a etapa de UI extrair os valores reais (`get_design_context`/variáveis) de cada frame.
- Observações do arquivo:
  - A página se chama "Marketplace de NFTs GreenMint", mas os textos usam a marca Kurio.
  - Carrinho mobile mostra subtotal 8.92 ETH, porém os itens somam 8.14 ETH (1.19 + 1.39 + 2×1.79 + 2×0.99). O desktop é consistente (26.83 + 0.016 = 26.846). As fixtures usarão dados coerentes.
  - IDs de token divergem entre carrinho e recibo desktop (Violet Nomad `#0009` vs `#0314`; Ivory Baron `#0552` vs `#0088`).
- **Filtros verificados no painel `70485:382`:** coleções Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas e Utilidade; preço mínimo/máximo (exemplo visual `0,02`–`12,30 ETH`); redes Ethereum, Polygon e Solana. `NftListQuery` representa coleções e redes como arrays combináveis. `nft-query.ts` os serializa como parâmetros repetidos em ordem estável.

## Decisões

- Vite + React 19 + TS estrito; alias `@` para `src`.
- Route tree gerada por `scripts/generate-routes.mjs` antes de `typecheck` e `build`, para não depender do dev server. A tentativa de instalar `@tanstack/router-cli` falhou com ERESOLVE na etapa 1; a causa provável é o conflito de peer do `msw` descrito abaixo, mas não foi retestada. O script atende e foi mantido.
- **MSW fixado em 2.x (2.15.0).** O `@mswjs/socket.io-binding@0.2.0` (recomendado no README do desafio) exige `msw@^2.10.2`; com `msw@3` a árvore de dependências ficava inválida. Em 2.x a opção de requisições sem handler é `onUnhandledRequest` (em 3.x seria `onUnhandledFrame`). `public/mockServiceWorker.js` foi regenerado na mesma versão. Ao atualizar o MSW, rodar `npx msw init public/` de novo.
- Mocks carregados por import dinâmico, só com `VITE_ENABLE_MOCKS=true`; com `false` o chunk do MSW sai do build.
- Scripts multiplataforma: variáveis de ambiente via `cross-env`; encadeamento só com `&&`.
- Axios: instância única, sem dados fictícios; erros normalizados em `ApiError`.
- Cache/retry: retry (até 2) só para falha transitória, rede e timeout; mutations sem retry; `staleTime` 30 s.
- shadcn/ui: `components.json` e tokens neutros configurados manualmente (o CLI depende de `ui.shadcn.com`, fora da rede liberada no ambiente de desenvolvimento).

## Valores ETH (`src/shared/lib/eth.ts`)

- Contrato: string decimal canônica, `>= 0`, até 18 casas, sem expoente/sinal/zeros à esquerda (`EthAmount`, tipo "branded").
- Cálculo: `decimal.js` com instância isolada (`Decimal.clone`). Operações: `addEth`, `subEth` (lança se ficar negativo), `mulEthByQuantity` (quantidade inteira), `sumEth`, `compareEth`, `eqEth`, `isZeroEth`, `normalizeEth`.
- `formatEth` é só apresentação (mínimo 2 e máximo 6 casas por padrão, meio para cima). O mínimo é limitado ao máximo solicitado e ambos devem ser inteiros entre 0 e 18. Nunca usar o texto formatado em cálculo ou comparação.
- Funções recusam `number` em runtime (`EthError`) e o TypeScript recusa em compilação.
- Descontos trafegam como valor positivo em `discount` e são subtraídos do subtotal.

## Contratos REST (`src/shared/api/contracts/`)

- Rotas em `routes.ts` (`API_ROUTES`), fonte única para Axios e handlers MSW. Recursos: sessão/conta, NFTs, favoritos, carrinho, cotação (`POST /quotes`), pedidos, perfil e carteiras.
- Erros: corpo `ApiErrorBody` com `code` (validação, sessão inválida/expirada, permissão, inexistente, conflito, disponibilidade, preço alterado, chave de idempotência reutilizada, cupom inválido/expirado, carteira recusada, falha transitória).
- Pedidos: `POST /orders` exige o cabeçalho `Idempotency-Key`. Mesma chave e mesmo corpo devolvem o mesmo pedido; mesma chave com corpo diferente dá 409 `IDEMPOTENCY_KEY_REUSED`. O corpo traz `quoteId` e `acceptedTotal`; divergência com a cotação vigente dá 409 `PRICE_CHANGED`. `Order.snapshot` é a cópia imutável usada no recibo.
- Eventos Socket.IO (`events.ts`): envelope com `eventId`, `resource`, `version`, `audienceUserId`. O cliente descarta duplicatas (`eventId`), versões antigas (`version` ≤ aplicada) e eventos de outro usuário. Eventos: `nft.updated`, `order.updated`.
- Contratos são só tipos TypeScript nesta etapa; validação em runtime das respostas (ex.: Zod) não foi adicionada.

## Catálogo MSW (etapa 3)

- `src/mocks/fixtures/nfts.ts` contém 18 itens cobrindo todas as nove categorias e as redes Ethereum, Polygon e Solana. SVGs determinísticos são servidos pelo handler local de assets.
- `GET /nfts` filtra por `q`, `tab`, `collection` repetido, preços ETH, `network` repetido e ordenação; só depois pagina. Empates usam id como chave estável. `total` e `totalPages` refletem o resultado filtrado. `GET /nfts/:id` resolve ID direto; item ausente retorna 404 `NOT_FOUND`.
- Axios usa `serializeNftListQuery` para arrays do catálogo; MSW usa o parser correspondente. Coleções/redes são deduplicadas e ordenadas na serialização. Valores ETH inválidos e enums desconhecidos são omitidos; paginação inválida vira página 1 e tamanho 12 (tamanho válido: 1–100).
- `VITE_MOCK_SCENARIO=catalog-default|catalog-resilience|catalog-failure` seleciona respostas sem latência, 350 ms de latência ou falha 503, respectivamente. `setMockScenario` e `resetMockScenario` permitem seleção/reset em testes ou demos; sem override, vale a configuração de ambiente.
- A etapa não implementa UI, autenticação, carrinho, Socket.IO funcional ou checkout. Os handlers disponíveis cobrem apenas catálogo e assets.

## Limitações conhecidas

- Browsers do Playwright não foram baixados no ambiente de desenvolvimento; rodar `npx playwright install chromium` localmente. Nenhum teste E2E existe ainda.
- Windows: os scripts usam `cross-env`, mas a execução foi verificada apenas em Linux.
