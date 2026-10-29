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
| `npm run audit:lighthouse` | Cria build de demonstração otimizado e mede início/detalhe em desktop/mobile (3 execuções por combinação) |

## Auditoria Lighthouse

Metas do desafio (por rota e perfil, usando a mediana): **Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 e SEO ≥ 90**. A configuração registra esses limites e `comparison.md` identifica explicitamente qualquer meta não atingida.

Resultado após as correções: [relatórios e três amostras por combinação](reports/lighthouse/2026-10-29T06-58-03Z/summary.md), [comparação com a baseline](reports/lighthouse/2026-10-29T06-58-03Z/comparison.md) e [causas e limitações restantes](reports/lighthouse/2026-10-29T06-58-03Z/analysis.md).

| Página / perfil | Performance antes → depois | Accessibility antes → depois | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Início desktop | 92 → 97 | 97 → 100 | 96 | 92 |
| Detalhe desktop | 96 → 98 | 93 → 100 | 96 | 92 |
| Início mobile | 54 → **66 (abaixo de 90)** | 95 → 100 | 96 | 92 |
| Detalhe mobile | 54 → **64 (abaixo de 90)** | 93 → 100 | 96 | 92 |

Performance mobile **continua sem atingir a meta**. LCP mediano caiu de 4.791 para 4.089 ms na home e de 5.052 para 4.236 ms no detalhe; TBT caiu de 1.646 para 831 ms e de 1.705 para 897 ms. As imagens já chegam mais cedo e menores, mas os novos traces ainda mostram tarefas longas na renderização React e inicialização/interceptação MSW, além de 76–77 KiB de JavaScript potencialmente não utilizado nesta navegação. O atraso de renderização continua relevante. Próximos candidatos são prerenderização das rotas públicas com hidratação/revalidação MSW e segmentação do trabalho de renderização/inicialização, medidos sem remover conteúdo ou bibliotecas exigidas. O hardware e o throttling influenciam os números, mas não eliminam esse gargalo real da aplicação.

Na baseline de 2026-10-29, as medianas de Performance foram 92 (início desktop), 96 (detalhe desktop) e 54 em ambas as páginas mobile. LCP/TBT medianos foram 1,66 s/114 ms (início desktop), 1,34 s/26 ms (detalhe desktop), 4,79 s/1,65 s (início mobile) e 5,05 s/1,70 s (detalhe mobile). Uma amostra desktop da home teve LCP de 5,26 s e TBT de 2,68 s, evidenciando variação do host. Os traces atribuem trabalho de script à inicialização do cliente e ao bundle do MSW exigido no cenário; os insights também não detectaram prioridade alta para as imagens de LCP. Uma melhoria possível é priorizar a imagem principal e reduzir trabalho síncrono de inicialização, mantendo mocks e recursos funcionais.

Na baseline, Accessibility variou entre 93 e 97, com avisos de contraste, ordem de headings, atributos ARIA e nomes acessíveis. A continuação corrige o papel semântico das estrelas, inclui o texto visível no nome de Favoritar, nomeia o grupo de quantidade, ajusta o contraste e inclui um heading de catálogo sem alterar o layout. Best Practices 96 e SEO 92 já atingiam as metas; os achados preexistentes de favicon ausente e `robots.txt` respondido pelo fallback SPA continuam registrados.

Execute `npm run audit:lighthouse` em uma máquina com Chromium instalado por Playwright (`npx playwright install chromium`). O script gera o build de produção com `VITE_ENABLE_MOCKS=true` e `catalog-default`, inicia um preview local e executa Lighthouse 3 vezes em cada combinação de página (início e `/nft/nft-005`) e perfil (desktop e mobile), totalizando 12 medições. Cada medição inicia um Chromium separado. Mobile mantém emulação e throttling simulados padrão do Lighthouse; desktop mantém o preset desktop. Roboto Mono agora é servida localmente com os mesmos pesos e subsets e licença em `public/fonts/OFL.txt`; não é necessário Google Fonts durante a execução.

Os relatórios HTML/JSON por medição, `summary.md`, `summary.json`, `environment.json`, `config.json` e `comparison.md` ficam em `reports/lighthouse/<timestamp-UTC>/`. Cada execução cria uma pasta nova e preserva integralmente `reports/lighthouse/2026-10-29/`. O resumo registra as três amostras de LCP, CLS e TBT, suas medianas e os scores medianos; o JSON mantém os valores sem arredondamento. A comparação usa a baseline original e as metas. Resultados incompletos ou métricas ausentes interrompem o runner, sem produzir uma mediana parcial. Para apenas reagregar relatórios existentes, use `npm run audit:lighthouse -- --summarize-existing --report-dir=reports/lighthouse/<timestamp-UTC>`.

As medições continuam sequenciais e frias, com MSW e Socket.IO ativos. As artes PNG originais foram preservadas e receberam variantes WebP responsivas (320/640/1024 px, qualidade 94), usadas em início e detalhe. `node scripts/optimize-artwork.mjs` regenera essas variantes sem dependências novas; `node scripts/vendor-font.mjs` regenera a fonte e sua licença. O hero tem preload limitado à home; a imagem principal tem prioridade alta e o detalhe antecipa sua consulta REST usando o mesmo cache TanStack Query. O carregamento da aplicação e a instalação do MSW ocorrem em paralelo, aguardando os interceptores antes de renderizar. Handlers privados carregam sob demanda; arquivos públicos recebem passthrough imediato, enquanto APIs, SVGs mockados e Socket.IO mantêm seus handlers.

CPU/carga do host ainda afetam a variação: compare execuções na mesma máquina e confira versões e condições em `environment.json`/`config.json`. Cumprir os scores automatizados não equivale a conformidade WCAG completa nem substitui testes com leitor de tela. Não houve nova comparação direta com Figma; os snapshots existentes verificam preservação visual.

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

## Acessibilidade e regressao visual

- `npm run test:e2e -- src/test/visual.spec.ts` executa a matriz Chromium nos viewports 390, 768 e 1440 px, valida reflow nas rotas principais e captura inicio, detalhe, carrinho e checkout.
- Baselines ficam em `src/test/visual.spec.ts-snapshots/`. Para revisar uma mudanca intencional, execute `npm run test:e2e -- src/test/visual.spec.ts --update-snapshots` e confira todas as imagens geradas no diff.
- Os testes usam MSW e contexts isolados do Playwright; as capturas desativam animacoes e permitem diferenca de ate 1.5% dos pixels para variacao de rasterizacao de fontes. A validacao automatizada de foco cobre o drawer mobile. Nao declara conformidade WCAG completa; testes manuais com leitor de tela ainda sao necessarios.
