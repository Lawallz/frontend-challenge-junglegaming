# Continuação da auditoria Lighthouse

As 12 medições terminaram com sucesso. A meta de Performance mobile **não foi atingida**: 66 na home e 64 no detalhe. As outras 14 combinações de categoria/página/perfil atingem suas metas. A baseline em `../2026-10-29/` foi preservada, incluindo HTML, JSON e resumo originais.

## Evidências e mudanças

| Causa observada na baseline | Correção implementada | Evidência posterior |
| --- | --- | --- |
| PNGs de aproximadamente 1,9–2,1 MB; imagem principal descoberta tarde, sem prioridade alta | Originais preservados; WebP responsivo em 320/640/1024 px, qualidade 94; preload do hero apenas na home e prioridade alta da imagem principal | Hero mobile usa 22.686 bytes; variante de detalhe em 1024 px usa 136.576 bytes; snapshots existentes passam sem atualização |
| Fonte dependente de CSS/arquivos Google Fonts em rede externa | Mesma Roboto Mono, pesos 400/500/600/700 e todos os subsets, servida localmente em WOFF2 com licença OFL; preload do subset latino | Nenhuma dependência externa para carregar fonte durante a auditoria |
| Inicialização sequencial da aplicação e do worker; custo de handlers MSW na thread principal | Carregamento paralelo do renderer e MSW, registro antecipado do service worker, handlers privados sob demanda e logs detalhados somente em desenvolvimento | TBT mediano mobile reduzido de 1.646/1.705 ms para 831/897 ms |
| Arquivos estáticos reais testavam os handlers REST antes de passthrough | Primeiro handler restrito aos diretórios de arquivos públicos; APIs, SVGs gerados e Socket.IO continuam interceptados | Testes de roteamento confirmam passthrough de WebP, resposta SVG gerada, REST de NFT e 404 |
| Comparação linguística de datas UTC/IDs no caminho inicial do catálogo | Comparação ASCII de timestamps canônicos e IDs para ordenação recente; nomes conservam ordenação linguística | Teste verifica ordem descendente e desempate estável |
| Detalhe: estrelas com `aria-label` em `span` sem papel; nome de Favoritar não continha o texto visível; breadcrumb com contraste 4,33:1 | `role="img"` nas estrelas, nomes acessíveis incluem Favoritar/Salvo, grupo nomeado de quantidade e breadcrumb mais claro dentro da paleta Kurio | Accessibility 100 em detalhe desktop e mobile, antes 93 |
| Home: contraste de IDs/contadores e heading intermediário ausente no mobile | Ajuste sutil de cores e heading de catálogo acessível sem alterar layout | Accessibility 100 em home desktop e mobile |

O prefetch REST do detalhe começa no `beforeLoad` da rota, compartilha `nftDetailQuery` com `useQuery` e conserva estados de erro/carregamento. Nenhuma resposta foi substituída por dados estáticos na interface. A renderização aguarda os interceptores para não antecipar REST/Socket.IO antes do MSW. O carregamento assíncrono de pedidos verifica se a assinatura ainda existe antes de emitir eventos.

## Metas e limitações restantes

Consulte [comparison.md](comparison.md) para todos os scores, metas e deltas e [summary.md](summary.md) para as três amostras e medianas de LCP, CLS e TBT. Performance desktop ficou em 97/98; Accessibility em 100 nas quatro combinações; Best Practices em 96 e SEO em 92. Apenas Performance mobile ficou abaixo de 90.

Nos novos relatórios mobile, `bootup-time` ainda estima 1,7–1,9 s de execução de JavaScript em amostras representativas. `mainthread-work-breakdown` registra 2,9–3,6 s de trabalho total; os grupos de renderização React e MSW ainda produzem tarefas longas. `unused-javascript` estima 76–77 KiB não utilizados nesta navegação nos chunks compartilhados HTTP/MSW e renderer. Isso é uma oportunidade de segmentação, não justificativa para remover bibliotecas, mocks ou funcionalidades. O insight de LCP também aponta atraso entre disponibilidade do recurso e pintura; seus tempos de trace não devem ser confundidos com o LCP agregado da simulação Lighthouse.

As próximas intervenções a avaliar são prerenderização das rotas públicas com hidratação e revalidação pela rede MSW, segmentação do trabalho da renderização inicial e refinamento do carregamento de dependências usando APIs suportadas. Não há evidência de que apenas uma alteração de hardware resolveria o déficit: as três amostras mobile continuam abaixo da meta. Não foram reduzidos throttling, categorias, número de amostras ou quantidade de conteúdo para favorecer o resultado.

Os achados preexistentes de `/favicon.ico` 404 (Best Practices) e `robots.txt` respondido pelo fallback HTML (SEO) permanecem; essas categorias já satisfazem as metas. Não houve comparação nova com frames Figma. Os 12 snapshots existentes de início/detalhe/carrinho/checkout em 390/768/1440 px passaram sem atualização e sem aumento de tolerâncias; isso não substitui auditoria manual com leitor de tela.

## Verificações finais

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Sucesso |
| `npm run typecheck` | Sucesso |
| `npm run test:unit` | Sucesso: 69 testes em 9 arquivos |
| `npm run test:e2e -- --workers=1` | Sucesso: 48 aprovados, 4 skips previstos para não duplicar a matriz visual no projeto mobile |
| `npm run build:demo` | Sucesso |
| `npm run audit:lighthouse` | Sucesso da execução: 12 medições, 12 HTML + 12 JSON; metas mobile de Performance pendentes |

Um teste novo de SVG falhou inicialmente no Node porque o matcher relativo dependia da origem do navegador. O matcher foi corrigido para a origem variável e o conjunto unitário final passou. Houve medições diagnósticas intermediárias; este diretório contém somente a série final completa.

## Arquivos envolvidos

- Bootstrap: `src/app/main.tsx`, novo `src/app/render.tsx`, `index.html`.
- Interface: `src/features/catalog/catalog-page.tsx`, `src/features/nft-detail/nft-detail-page.tsx`, novo `src/features/nft-detail/nft-detail-query.ts`, `src/routes/nft.$nftId.tsx`, `src/features/favorites/favorite-button.tsx`, novo `src/shared/ui/nft-artwork.tsx`, `src/app/styles/globals.css`.
- MSW: `src/mocks/enable-mocks.ts`, `src/mocks/handlers/index.ts`, `src/mocks/handlers/assets.ts`, `src/mocks/handlers/catalog-query.ts`, `src/mocks/realtime.ts`, `src/mocks/handlers/nfts.test.ts`, novo `src/mocks/handlers/routing.test.ts`.
- Assets: 12 variantes `public/nft-art/figma-ape-{green,violet,sage,gold}-{320,640,1024}.webp`; seis WOFF2, CSS e licença em `public/fonts/`. Os quatro PNGs originais permanecem intactos.
- Ferramentas: `scripts/lighthouse-audit.mjs`, `scripts/lighthouse-audit.config.json`, novos `scripts/optimize-artwork.mjs` e `scripts/vendor-font.mjs`.
- Documentação e resultados: `README.md`, `ARCHITECTURE.md`, este diretório de relatórios. `package.json` e os artefatos da baseline já estavam alterados/adicionados na branch e foram preservados.
