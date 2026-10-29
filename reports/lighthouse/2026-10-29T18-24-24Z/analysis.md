# Rodada intermediária: MSW original, antecipação de código e imagens

Esta série completa conserva o MSW original e avalia a antecipação da implementação da rota junto com os ajustes de imagens. **Não é a versão final do código.**

| Mobile | Controle sem otimizações desta rodada | Esta série |
| --- | ---: | ---: |
| Performance home | 90 | 89 |
| LCP home, mediana ms | 3638 | 3762 |
| TBT home, mediana ms | 59 | 65 |
| Performance detalhe | 87 | 87 |
| LCP detalhe, mediana ms | 4016 | 4057 |
| TBT detalhe, mediana ms | 71 | 58 |

Os seis controles estão em [control/](../2026-10-29T18-13-54Z/control/); suas limitações estão na [análise correspondente](../2026-10-29T18-13-54Z/analysis.md). O resultado não valida a antecipação de módulos: ela foi removida da versão final. O bootstrap volta ao código original, com carregamento paralelo do renderer e MSW e descoberta das páginas pelo router.

Os ajustes de `sizes` e lazy loading foram mantidos pelo efeito concreto nos recursos solicitados. Em `home-mobile-1`, as variantes efetivamente pedidas são de 320 px: verde 22.686 bytes, violeta 23.272, sage 24.378 e gold 20.390. Antes, várias variantes de 640 px eram solicitadas, inclusive por imagens secundárias pequenas. A seleção agora acompanha os tamanhos do CSS, preservando arquivos, conteúdo e resolução necessária para o slot/DPR.

Como o renderer ainda aparece entre as tarefas longas, a última intervenção separa o botão de favoritos autenticado do estado de visitante. Assim, visitantes não criam observadores desabilitados de query/mutation por card. A versão final será novamente verificada e medida com os mesmos presets e throttling, sem modificar MSW ou Socket.IO.

Accessibility continua 100, Best Practices 96 e SEO 92 em todas as combinações. As metas de Performance mobile continuam não atingidas nesta série. A diferença em relação aos 66/64 históricos não pode ser atribuída às alterações: o hardware mudou de i5-6200U para Ryzen 5 5600G.
