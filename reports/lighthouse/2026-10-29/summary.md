# Lighthouse — auditoria reproduzível

Executada em 2026-10-29T06:13:40.858Z; Lighthouse 13.6.0, Chromium 156.0.8078.4, Node v24.15.0. Build de produção com MSW catalog-default.

Valores de score em pontos (0–100); LCP/TBT em ms e CLS sem unidade. Cada célula de métricas lista as três medições; a última coluna é a mediana.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (3; mediana) | CLS (3; mediana) | TBT (3; mediana) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| home | desktop | 92 | 97 | 96 | 92 | 1655, 5263, 1386; **1655** | 0.001, 0.001, 0.001; **0.001** | 114, 2684, 42; **114** |
| nft-detail | desktop | 96 | 93 | 96 | 92 | 1341, 1413, 1334; **1341** | 0.006, 0.010, 0.006; **0.006** | 26, 24, 37; **26** |
| home | mobile | 54 | 95 | 96 | 92 | 5241, 4791, 4687; **4791** | 0.001, 0.001, 0.001; **0.001** | 1646, 1334, 1700; **1646** |
| nft-detail | mobile | 54 | 93 | 96 | 92 | 5394, 4834, 5052; **5052** | 0.001, 0.001, 0.000; **0.001** | 2428, 1149, 1705; **1705** |

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

Scores abaixo de metas do README: o README existente não especificava metas numéricas; os valores são registrados como baseline, sem limiar de aprovação.

