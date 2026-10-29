# Rodada intermediária: antecipação de código e imagens responsivas

Esta série completa de 12 medições inclui o experimento de roteamento estático do service worker e as mudanças de carregamento das páginas. **Não representa a versão final do código.**

| Mobile | Apenas roteamento estático | Com antecipação de código e ajustes de imagens |
| --- | ---: | ---: |
| Performance home | 84 | 88 |
| LCP home, mediana ms | 4651 | 3827 |
| TBT home, mediana ms | 49 | 83 |
| Performance detalhe | 83 | 83 |
| LCP detalhe, mediana ms | 4679 | 4659 |
| TBT detalhe, mediana ms | 75 | 68 |

Todas as combinações mantêm Accessibility 100, Best Practices 96 e SEO 92. Performance mobile continua abaixo de 90. Consulte [summary.md](summary.md) para as amostras completas.

As mudanças de carregamento antecipam somente a implementação da rota atual, em paralelo ao renderer/MSW. Não antecipam renderização, REST ou Socket.IO antes dos interceptores. O catálogo declara tamanhos coerentes com seu CSS; hero secundário e miniaturas usam seus tamanhos reais, e promoções usam lazy loading. Os snapshots existentes passaram sem atualização ou tolerâncias novas.

O roteamento estático experimental foi descartado após esta série: não apresentou ganho consistente de TBT e adicionou um caminho específico de navegador. A versão final conserva o worker e o passthrough MSW originais e mantém somente as mudanças pequenas de carregamento de código/imagens.

Veja [a análise da primeira série](../2026-10-29T18-13-54Z/analysis.md) e seus seis controles para a diferença de hardware e de contabilização de bytes. O host atual é Ryzen 5 5600G, enquanto os 66/64 históricos vieram de um i5-6200U; esses deltas não isolam o efeito das correções. Nenhuma configuração de Lighthouse ou throttling foi alterada.
