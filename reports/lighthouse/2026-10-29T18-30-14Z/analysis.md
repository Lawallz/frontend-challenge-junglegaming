# Rodada final de otimização mobile

**Performance mobile no detalhe continua abaixo da meta: 87, contra 90 exigidos.** A home atingiu 90 por mediana, com amostras 90/89/90. As outras categorias atingem as metas nas quatro combinações. Estes resultados correspondem ao código final; as séries anteriores desta sessão são experimentais.

## Resultados reais

| Página / perfil | Performance | Accessibility | Best Practices | SEO | LCP mediano ms | TBT mediano ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 99 | 100 | 96 | 92 | 845 | 0 |
| Detalhe desktop | 100 | 100 | 96 | 92 | 820 | 0 |
| Home mobile | 90 | 100 | 96 | 92 | 3641 | 74 |
| Detalhe mobile | 87 | 100 | 96 | 92 | 3943 | 69 |

[summary.md](summary.md) contém as três amostras por combinação; [comparison.md](comparison.md) registra cada meta, e [environment.json](environment.json) identifica o ambiente. Não se produziu mediana parcial.

## Hardware e controles

O host atual usa Ryzen 5 5600G / 31,39 GiB, enquanto os 66/64 anteriores vieram de i5-6200U / 7,92 GiB. Portanto, **não se atribui a diferença histórica ao código**. Os seis controles diagnósticos desta sessão, com MSW e sem as otimizações finais, já marcavam 90/87 no host atual. A metodologia e as limitações desses controles estão [na análise intermediária](../2026-10-29T18-13-54Z/analysis.md), incluindo diferenças de build e o wrapper usado no controle.

| Mobile | Performance controle → final | LCP mediano ms | TBT mediano ms |
| --- | ---: | ---: | ---: |
| Home | 90 → 90 | 3638 → 3641 | 59 → 74 |
| Detalhe | 87 → 87 | 4016 → 3943 | 71 → 69 |

Não houve aumento dos scores nem ganho consistente de TBT frente ao controle. As pequenas diferenças de CPU/LCP não estabelecem um efeito isolado das alterações. A confirmação no hardware anterior não foi feita.

## Diagnóstico usado para escolher as mudanças

Nos relatórios anteriores, o LCP da home é `/nft-art/figma-ape-green-320.webp`, no hero, com 22.686 bytes. Em [home-mobile-2](../2026-10-29T06-58-03Z/home-mobile-2.report.json), o recurso chega cedo, mas o insight registra aproximadamente 2068 ms de atraso de renderização. No detalhe, o LCP é a imagem principal de Tiny Voyager, `/nft-art/figma-ape-green-1024.webp`, com 136.576 bytes; [nft-detail-mobile-2](../2026-10-29T06-58-03Z/nft-detail-mobile-2.report.json) registra aproximadamente 888 ms até iniciar seu carregamento. Esses tempos de trace não são o LCP agregado da simulação.

As tarefas longas atribuídas ao renderer chegam a 279/220/155 ms na home e 406/225/183 ms no detalhe. O chunk do MSW aparece com 79/75/72 ms e 104/98/94 ms, respectivamente. Há ainda tarefas sem atribuição, de até 222 ms na home e 314 ms no detalhe; não se atribuiu esse trabalho a componentes específicos sem evidência adicional.

## Alterações mantidas

- Imagens: `sizes` do catálogo mobile representa os 48 px de padding e 11 px de gap da grade; o hero secundário declara seus 77/146 px. Promoções fora da área visível usam lazy loading. Miniaturas, quando a API fornece mais de uma imagem, declaram 70 px e usam lazy loading; os fixtures auditados têm uma imagem por NFT, portanto esse último ajuste não teve efeito medido no detalhe.
- Favoritos: visitantes não montam os observadores de query/mutation antes desabilitados em cada card. O componente autenticado conserva o cache por usuário, mutations, invalidação e tratamento de sessão expirada. Os links de login, retorno seguro e estado de carregamento foram preservados. Isso elimina trabalho repetido identificado no código; não se declara uma redução de TBT que os resultados não confirmaram.

Em `home-mobile-1`, a soma de `resourceSize` das imagens solicitadas caiu de 323.362 bytes no controle para 113.412 bytes na versão final, aproximadamente 64,9%. O catálogo usa variantes de 320 px em vez das de 640 px quando o slot/DPR permite. A soma inclui solicitações repetidas e **não equivale a bytes efetivamente transferidos na rede**: o passthrough MSW reporta `transferSize: 0` em diversos recursos. Os PNGs/WebPs, qualidade de codificação, CSS e conteúdo não foram modificados.

## Experimentos descartados

| Série | Experimento | Performance mobile home / detalhe |
| --- | --- | ---: |
| [18:13 UTC](../2026-10-29T18-13-54Z/analysis.md) | Roteamento estático de assets no worker | 84 / 83 |
| [18:20 UTC](../2026-10-29T18-20-00Z/analysis.md) | Roteamento estático + antecipação de módulos + imagens | 88 / 83 |
| [18:24 UTC](../2026-10-29T18-24-24Z/analysis.md) | MSW original + antecipação de módulos + imagens | 89 / 87 |

O roteamento estático não mostrou benefício consistente de TBT e adicionava um caminho específico de navegador. A antecipação de módulos também não foi validada pelos controles. Ambos foram removidos. Os 12 HTML/JSON de cada série e os seis controles JSON foram preservados; nenhum desses resultados foi apresentado como a versão final. O worker, handlers, bootstrap, Socket.IO, configuração e runner Lighthouse finais são os originais da branch.

## Verificações finais

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run lint` | Sucesso |
| `npm.cmd run typecheck` | Sucesso |
| `npm.cmd run test:unit` | 69 testes em nove arquivos aprovados |
| `npm.cmd run test:e2e -- --workers=1` | 48 aprovados e quatro skips previstos |
| `npm run build:demo` | Sucesso, inclusive antes da auditoria final |
| `npm run audit:lighthouse` | 12 medições finais completas, 12 HTML + 12 JSON |

Os 12 snapshots existentes passaram sem atualização e sem afrouxamento de tolerâncias. A suíte validou login, expiração, favoritos entre contas, carrinho, checkout, pedidos, reconexão e eventos Socket.IO. O checklist React foi aplicado: hooks autenticados em componente separado, sem hooks condicionais ou mudanças de semântica/nomes acessíveis.

Houve execuções intermediárias de verificação: uma foi interrompida porque `npm.ps1` não repassou o argumento de um worker; outra teve um 404 de navegação porque o `dist` foi reconstruído durante o teste. O trace confirmou a falha do preview nesse intervalo. O procedimento foi corrigido para testes/build/auditoria sequenciais; a suíte final acima passou sem alterar testes, timeouts ou retries para esconder a falha.

O Lighthouse 13.6.0 exigia Node >= 22.19, mas o padrão local era 22.16.0. A auditoria foi executada com Node 24.15.0 obtido no cache do npm; dependências/lockfile não foram alterados. As configurações mobile de throttling, emulação, categorias e método de simulação foram comparadas às anteriores e são iguais.

## Pendências e limites

O detalhe ainda precisa atingir Performance 90 e a home tem margem pequena. O renderer continua produzindo tarefas longas (77 ms na home e 94 ms no detalhe nas primeiras amostras finais); o bundle HTTP/MSW e o renderer ainda somam aproximadamente 76–77 KiB de JavaScript potencialmente não utilizado. Não houve prerenderização/hidratação ou reestruturação do MSW nesta rodada. São intervenções maiores que exigem validação própria, especialmente de cenários e revalidação, para não substituir respostas da API por fixtures na interface.

Não houve remoção de funcionalidades, alteração de throttling, commit, push, merge ou deploy. A revisão final inclui `git diff --check`, `git status` e os diffs de código/documentação; as pastas anteriores de relatórios e os arquivos gerados originais foram preservados.
