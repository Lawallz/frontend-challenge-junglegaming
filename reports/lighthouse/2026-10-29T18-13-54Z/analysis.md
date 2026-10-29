# Rodada intermediária: apenas roteamento estático

Esta série completa de 12 medições avalia somente o wrapper do service worker. **Não é a versão final da rodada de otimização.** Os arquivos de auditoria, presets, throttling e número de amostras não foram modificados.

A API explorada foi a [Service Worker Static Routing API](https://developer.chrome.com/blog/service-worker-static-routing). O experimento foi descartado depois das medições; nenhum wrapper ou regra estática permanece no código final.

## Resultado observado

| Página / perfil | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home desktop | 99 | 100 | 96 | 92 |
| Detalhe desktop | 99 | 100 | 96 | 92 |
| Home mobile | 84 | 100 | 96 | 92 |
| Detalhe mobile | 83 | 100 | 96 | 92 |

Performance mobile continua abaixo de 90. Consulte [summary.md](summary.md) para as três amostras e medianas.

## Controles e limitação da comparação histórica

O host atual é Ryzen 5 5600G / 31,39 GiB; a rodada anterior de 66/64 usou i5-6200U / 7,92 GiB. Portanto, a diferença histórica não isola o efeito do código. Lighthouse 13.6.0 e Chromium 156.0.8078.4 foram mantidos. A auditoria usou Node 24.15.0, compatível com o requisito do Lighthouse, sem alterar dependências.

Foram feitas três navegações frias mobile por página no host atual, sem regras estáticas. Os seis JSON estão em [control/](control/). O controle preservou o wrapper e seu `importScripts`, substituindo temporariamente apenas a cópia de `dist/kurio-service-worker.js` por `importScripts('./mockServiceWorker.js')`. O código fonte não foi alterado para o controle. O build do controle usou Node 22.16.0, com o mesmo cenário efetivo `catalog-default`; o build da série completa usou Node 24.15.0 e o cenário definido pelo runner. Portanto, são controles diagnósticos, não um experimento com bundles byte a byte idênticos. A auditoria de ambos usou Node 24.15.0 e as mesmas condições mobile; a única diferença nas opções de saída é JSON no controle versus HTML+JSON na série completa.

| Mobile | Performance sem regras → com regras | LCP mediano ms | TBT mediano ms |
| --- | ---: | ---: | ---: |
| Home | 90 → 84 | 3638 → 4651 | 59 → 49 |
| Detalhe | 87 → 83 | 4016 → 4679 | 71 → 75 |

O roteamento direto reduz o caminho real de interceptação, mas **não melhorou o score nesta série**. No controle `home-mobile-1`, a cadeia crítica observada termina em 226 ms; com regras, em 201 ms. O hero pinta em aproximadamente 203 ms no trace do controle e 180 ms com regras. Esses tempos observados não são o LCP simulado da tabela.

Há também uma diferença importante de contabilização: os arquivos que passam pelo passthrough MSW aparecem com `transferSize: 0` no controle. Pela rede direta, o Lighthouse registra seus bytes reais: por exemplo, o WebP violeta de 640 px passa de 0 a 81.414 bytes, incluindo cabeçalhos. A simulação passa a considerar transferências antes omitidas. Não se alterou a auditoria para esconder esse custo; não se deve apresentar a redução histórica de TBT como resultado isolado desta alteração.

## Próxima intervenção justificada por esta série

O código da página ainda é descoberto depois do renderer/worker/router. O hero secundário de 77 px usa `sizes` genérico e recebe uma variante maior que o necessário. O código de miniaturas também não declara seus 70 px, mas os fixtures auditados têm apenas uma imagem e não renderizam miniaturas; não há impacto medido desse caso nesta série. A próxima série avalia importação antecipada do código da rota atual e tamanhos responsivos coerentes com o CSS, além de carregamento lazy de promoções fora da área visível. Conteúdo, CSS, qualidade dos WebPs originais, estados REST e Socket.IO são preservados.
