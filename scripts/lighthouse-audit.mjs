import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(await readFile(resolve(root, 'scripts/lighthouse-audit.config.json'), 'utf8'))
const date = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
const reportDirArgument = process.argv.find(arg => arg.startsWith('--report-dir='))?.slice('--report-dir='.length)
const reportDir = reportDirArgument ? resolve(root, reportDirArgument) : resolve(root, config.outputDirectory, date)
const auditDir = resolve(root, 'node_modules/lighthouse')
const chromePath = chromium.executablePath()
const results = []
let environment

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} terminou com código ${code}`)))
  })
}

async function waitForServer(url, process) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Preview encerrou antes de iniciar (código ${process.exitCode})`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
  }
  throw new Error(`Preview não respondeu em ${url}`)
}

async function getChromeVersion() {
  const browser = await chromium.launch({ headless: true })
  const version = browser.version()
  await browser.close()
  return version
}

function metric(lhr, auditId) {
  return lhr.audits[auditId]?.numericValue ?? null
}

function validateMeasurement(lhr) {
  if (lhr.runtimeError) throw new Error(`Lighthouse runtime error: ${lhr.runtimeError.message}`)
  for (const category of config.categories) {
    if (!Number.isFinite(lhr.categories[category]?.score)) throw new Error(`Missing score: ${category}`)
  }
  for (const id of ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']) {
    if (!Number.isFinite(metric(lhr, id))) throw new Error(`Missing metric: ${id}`)
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)] ?? null
}

function score(lhr, category) {
  const value = lhr.categories[category]?.score
  return value === undefined || value === null ? null : value * 100
}

function row(runResult) {
  return {
    run: runResult.run,
    attempts: runResult.attempts,
    scores: runResult.scores,
    metrics: runResult.metrics,
  }
}

function format(value, digits = 0) {
  return value === null ? 'n/d' : Number(value).toFixed(digits)
}

async function reservePreviewPort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(config.previewPort, '127.0.0.1', () => server.close((error) => error ? reject(error) : resolvePromise()))
  })
}

if (process.argv.includes('--summarize-existing')) {
  environment = JSON.parse(await readFile(resolve(reportDir, 'environment.json'), 'utf8'))
  for (const profile of config.profiles) {
    for (const page of config.pages) {
      for (let runNumber = 1; runNumber <= config.runsPerCombination; runNumber += 1) {
        const baseName = `${page.id}-${profile}-${runNumber}`
        const lhr = JSON.parse(await readFile(resolve(reportDir, `${baseName}.report.json`), 'utf8'))
        validateMeasurement(lhr)
        results.push({
          page: page.id,
          path: page.path,
          profile,
          run: runNumber,
          attempts: 1,
          report: `${baseName}.report.html`,
          json: `${baseName}.report.json`,
          scores: Object.fromEntries(config.categories.map((category) => [category, score(lhr, category)])),
          metrics: {
            lcpMs: metric(lhr, 'largest-contentful-paint'),
            cls: metric(lhr, 'cumulative-layout-shift'),
            tbtMs: metric(lhr, 'total-blocking-time'),
          },
        })
      }
    }
  }
} else {
  await mkdir(reportDir, { recursive: true })
  await writeFile(resolve(reportDir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`)
  const npmCli = process.env.npm_execpath ?? resolve(root, 'node_modules/npm/bin/npm-cli.js')
  await run(process.execPath, [npmCli, 'run', 'build:demo'], { env: { ...process.env, VITE_MOCK_SCENARIO: config.scenario } })
  await reservePreviewPort()

  const preview = spawn(process.execPath, [
    resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(config.previewPort), '--strictPort',
  ], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_ENABLE_MOCKS: 'true', VITE_MOCK_SCENARIO: config.scenario },
  })

  try {
  await waitForServer(config.baseUrl, preview)
  const chromeVersion = await getChromeVersion()
  const platform = await import('node:os')
  environment = {
    capturedAt: new Date().toISOString(),
    os: `${platform.default.type()} ${platform.default.release()} (${platform.default.arch()})`,
    cpu: platform.default.cpus()[0]?.model ?? 'unknown',
    logicalCpus: platform.default.cpus().length,
    totalMemoryGiB: Number((platform.default.totalmem() / 1024 ** 3).toFixed(2)),
    node: process.version,
    npm: process.env.npm_config_user_agent?.match(/^npm\/([^ ]+)/)?.[1] ?? 'unknown (run via npm for exact version)',
    lighthouse: JSON.parse(await readFile(resolve(auditDir, 'package.json'), 'utf8')).version,
    playwright: JSON.parse(await readFile(resolve(root, 'node_modules/@playwright/test/package.json'), 'utf8')).version,
    chromium: chromeVersion,
    build: 'Vite production build via npm run build:demo',
    scenario: config.scenario,
    origin: config.baseUrl,
    conditions: {
      repetition: '3 sequential cold navigations per route/profile; separate Lighthouse Chrome process per run',
      desktop: 'Lighthouse desktop preset, simulated throttling',
      mobile: 'Lighthouse default mobile preset (Moto G Power emulation), simulated slow 4G and CPU throttling',
      network: 'loopback preview, MSW catalog-default fixtures, responsive local artwork and self-hosted Roboto Mono; no external network dependency',
      categories: config.categories,
      locale: config.locale,
    },
  }
  await writeFile(resolve(reportDir, 'environment.json'), `${JSON.stringify(environment, null, 2)}\n`)

  for (const profile of config.profiles) {
    for (const page of config.pages) {
      for (let runNumber = 1; runNumber <= config.runsPerCombination; runNumber += 1) {
        const baseName = `${page.id}-${profile}-${runNumber}`
        const outputPath = resolve(reportDir, baseName)
        const url = new URL(page.path, config.baseUrl).toString()
        const args = [
          resolve(auditDir, 'cli/index.js'), url,
          '--quiet', '--output=html', '--output=json', `--output-path=${outputPath}`,
          `--locale=${config.locale}`,
          `--chrome-flags=--headless --no-sandbox --disable-gpu --disable-background-networking --no-first-run --no-default-browser-check`,
          `--only-categories=${config.categories.join(',')}`,
        ]
        if (profile === 'desktop') args.push('--preset=desktop')
        console.log(`\nAuditando ${page.id} (${profile}), medição ${runNumber}/${config.runsPerCombination}: ${url}`)
        let attempts = 0
        while (true) {
          attempts += 1
          try {
            await run(process.execPath, args, { env: { ...process.env, CHROME_PATH: chromePath } })
            break
          } catch (error) {
            if (attempts >= 2) throw error
            console.warn(`Lighthouse falhou nesta execução; repetindo uma vez em Chromium novo: ${error.message}`)
          }
        }
        const lhr = JSON.parse(await readFile(`${outputPath}.report.json`, 'utf8'))
        validateMeasurement(lhr)
        results.push({
          page: page.id,
          path: page.path,
          profile,
          run: runNumber,
          attempts,
          report: `${baseName}.report.html`,
          json: `${baseName}.report.json`,
          scores: Object.fromEntries(config.categories.map((category) => [category, score(lhr, category)])),
          metrics: {
            lcpMs: metric(lhr, 'largest-contentful-paint'),
            cls: metric(lhr, 'cumulative-layout-shift'),
            tbtMs: metric(lhr, 'total-blocking-time'),
          },
        })
      }
    }
  }
} finally {
  preview.kill()
}
}

const combinations = []
for (const profile of config.profiles) {
  for (const page of config.pages) {
    const measurements = results.filter((result) => result.profile === profile && result.page === page.id)
    if (measurements.length !== config.runsPerCombination) throw new Error('Incomplete Lighthouse combination')
    const categoryMedians = Object.fromEntries(config.categories.map((category) => [
      category,
      median(measurements.map((measurement) => measurement.scores[category]).filter((value) => value !== null)),
    ]))
    const metricMedians = Object.fromEntries(['lcpMs', 'cls', 'tbtMs'].map((metricName) => [
      metricName,
      median(measurements.map((measurement) => measurement.metrics[metricName]).filter((value) => value !== null)),
    ]))
    combinations.push({ page: page.id, path: page.path, profile, categoryMedians, metricMedians, measurements: measurements.map(row) })
  }
}

const summary = { generatedAt: new Date().toISOString(), environment, targets: config.targets, combinations }
await writeFile(resolve(reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
const lines = [
  '# Lighthouse — auditoria reproduzível',
  '',
  `Executada em ${environment.capturedAt}; Lighthouse ${environment.lighthouse}, Chromium ${environment.chromium}, Node ${environment.node}. Build de produção com MSW ${config.scenario}.`,
  '',
  'Valores de score em pontos (0–100); LCP/TBT em ms e CLS sem unidade. Cada célula de métricas lista as três medições; a última coluna é a mediana.',
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (3; mediana) | CLS (3; mediana) | TBT (3; mediana) |',
  '| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |',
]
for (const combination of combinations) {
  const category = (name) => format(combination.categoryMedians[name])
  const metricValues = (name, digits = 0) => `${combination.measurements.map((measurement) => format(measurement.metrics[name], digits)).join(', ')}; **${format(combination.metricMedians[name], digits)}**`
  lines.push(`| ${combination.page} | ${combination.profile} | ${category('performance')} | ${category('accessibility')} | ${category('best-practices')} | ${category('seo')} | ${metricValues('lcpMs')} | ${metricValues('cls', 3)} | ${metricValues('tbtMs')} |`)
}
lines.push('', '## Relatórios por medição', '', ...results.map((result) => `- ${result.page} / ${result.profile} / ${result.run}: [HTML](${result.report}) · [JSON](${result.json})`), '', '## Condições', '', '- Três execuções sequenciais por combinação; cada Lighthouse inicia um Chromium limpo e navega sem autenticação.', '- Perfil desktop usa o preset desktop. Mobile usa o perfil móvel padrão do Lighthouse (emulação Moto G Power, slow 4G e CPU throttling simulados).', '- Build otimizado servido localmente em loopback, sem extensões; catálogo padrão determinístico do MSW e arte SVG local. Nenhum recurso foi removido para a auditoria.', '- Lighthouse aplica simulação de rede/CPU e calcula medianas entre três amostras. Resultados ainda variam com carga do host; compare execuções no mesmo hardware e condições.', '', 'Metas do desafio: Performance >= 90, Accessibility >= 95, Best Practices >= 95 e SEO >= 90. Consulte comparison.md para o resultado de cada combinação.', '')
lines.push('## Metas do desafio', '', '| Categoria | Meta |', '| --- | ---: |',
  ...config.categories.map(category => `| ${category} | ${config.targets[category]} |`), '')
const baseline = JSON.parse(await readFile(resolve(root, config.baselineDirectory, 'summary.json'), 'utf8'))
const comparison = [
  '# Comparacao com a baseline de 2026-10-29', '',
  'Cada valor novo e a mediana de tres medicoes. Os perfis e o throttling Lighthouse foram preservados.', '',
  '| Pagina / perfil | Categoria | Antes | Depois | Meta | Resultado |',
  '| --- | --- | ---: | ---: | ---: | --- |',
]
for (const combination of combinations) {
  const previous = baseline.combinations.find(item => item.page === combination.page && item.profile === combination.profile)
  for (const category of config.categories) {
    const current = combination.categoryMedians[category]
    comparison.push(`| ${combination.page} / ${combination.profile} | ${category} | ${previous.categoryMedians[category]} | ${current} | ${config.targets[category]} | ${current >= config.targets[category] ? 'Atingida' : 'ABAIXO DA META'} |`)
  }
}
comparison.push('', '| Pagina / perfil | LCP ms (antes → depois) | CLS (antes → depois) | TBT ms (antes → depois) |', '| --- | --- | --- | --- |')
for (const combination of combinations) {
  const previous = baseline.combinations.find(item => item.page === combination.page && item.profile === combination.profile)
  comparison.push(`| ${combination.page} / ${combination.profile} | ${format(previous.metricMedians.lcpMs)} → ${format(combination.metricMedians.lcpMs)} | ${format(previous.metricMedians.cls, 6)} → ${format(combination.metricMedians.cls, 6)} | ${format(previous.metricMedians.tbtMs)} → ${format(combination.metricMedians.tbtMs)} |`)
}
await writeFile(resolve(reportDir, 'comparison.md'), `${comparison.join('\n')}\n`)
lines.push('[Comparacao de metas e metricas com a baseline](comparison.md)', '')
await writeFile(resolve(reportDir, 'summary.md'), `${lines.join('\n')}\n`)
console.log(`\nRelatórios gravados em ${reportDir}`)
