# Lighthouse — auditoria reproduzível

Executada em 2026-10-29T18:14:05.582Z; Lighthouse 13.6.0, Chromium 156.0.8078.4, Node v24.15.0. Build de produção com MSW catalog-default.

Valores de score em pontos (0–100); LCP/TBT em ms e CLS sem unidade. Cada célula de métricas lista as três medições; a última coluna é a mediana.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (3; mediana) | CLS (3; mediana) | TBT (3; mediana) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| home | desktop | 99 | 100 | 96 | 92 | 828, 826, 823; **826** | 0.000, 0.000, 0.000; **0.000** | 0, 0, 0; **0** |
| nft-detail | desktop | 99 | 100 | 96 | 92 | 891, 890, 887; **890** | 0.005, 0.005, 0.005; **0.005** | 0, 0, 0; **0** |
| home | mobile | 84 | 100 | 96 | 92 | 4651, 4651, 4649; **4651** | 0.000, 0.000, 0.000; **0.000** | 49, 50, 42; **49** |
| nft-detail | mobile | 83 | 100 | 96 | 92 | 4678, 4820, 4679; **4679** | 0.000, 0.000, 0.000; **0.000** | 69, 75, 79; **75** |

## Relatórios por medição

- home / desktop / 1: [HTML](home-desktop-1.report.html) · [JSON](home-desktop-1.report.json)
- home / desktop / 2: [HTML](home-desktop-2.report.html) · [JSON](home-desktop-2.report.json)
- home / desktop / 3: [HTML](home-desktop-3.report.html) · [JSON](home-desktop-3.report.json)
- nft-detail / desktop / 1: [HTML](nft-detail-desktop-1.report.html) · [JSON](nft-detail-desktop-1.report.json)
- nft-detail / desktop / 2: [HTML](nft-detail-desktop-2.report.html) · [JSON](nft-detail-desktop-2.report.json)
- nft-detail / desktop / 3: [HTML](nft-detail-desktop-3.report.html) · [JSON](nft-detail-desktop-3.report.json)
- home / mobile / 1: [HTML](home-mobile-1.report.html) · [JSON](home-mobile-1.report.json)
- home / mobile / 2: [HTML](home-mobile-2.report.html) · [JSON](home-mobile-2.report.json)
- home / mobile / 3: [HTML](home-mobile-3.report.html) · [JSON](home-mobile-3.report.json)
- nft-detail / mobile / 1: [HTML](nft-detail-mobile-1.report.html) · [JSON](nft-detail-mobile-1.report.json)
- nft-detail / mobile / 2: [HTML](nft-detail-mobile-2.report.html) · [JSON](nft-detail-mobile-2.report.json)
- nft-detail / mobile / 3: [HTML](nft-detail-mobile-3.report.html) · [JSON](nft-detail-mobile-3.report.json)

## Condições

- Três execuções sequenciais por combinação; cada Lighthouse inicia um Chromium limpo e navega sem autenticação.
- Perfil desktop usa o preset desktop. Mobile usa o perfil móvel padrão do Lighthouse (emulação Moto G Power, slow 4G e CPU throttling simulados).
- Build otimizado servido localmente em loopback, sem extensões; catálogo padrão determinístico do MSW e arte SVG local. Nenhum recurso foi removido para a auditoria.
- Lighthouse aplica simulação de rede/CPU e calcula medianas entre três amostras. Resultados ainda variam com carga do host; compare execuções no mesmo hardware e condições.

Metas do desafio: Performance >= 90, Accessibility >= 95, Best Practices >= 95 e SEO >= 90. Consulte comparison.md para o resultado de cada combinação.

## Metas do desafio

| Categoria | Meta |
| --- | ---: |
| performance | 90 |
| accessibility | 95 |
| best-practices | 95 |
| seo | 90 |

[Comparacao de metas e metricas com a baseline](comparison.md)

