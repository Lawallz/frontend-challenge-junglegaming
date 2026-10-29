import { mkdir, writeFile } from 'node:fs/promises'

// Keep all subsets and weights of the existing Google Fonts stylesheet.
const response = await fetch('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36' },
})
if (!response.ok) throw new Error(`Font CSS: ${response.status}`)
let css = await response.text()
await mkdir('public/fonts', { recursive: true })
const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g))]
for (const [index, url] of urls.entries()) {
  const font = await fetch(url)
  if (!font.ok) throw new Error(`Font: ${font.status}`)
  const name = `roboto-mono-${index}.${new URL(url).pathname.split('.').at(-1)}`
  await writeFile(`public/fonts/${name}`, Buffer.from(await font.arrayBuffer()))
  css = css.replaceAll(url, `/fonts/${name}`)
}
await writeFile('public/fonts/roboto-mono.css', css)
const license = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/OFL.txt')
if (!license.ok) throw new Error(`License: ${license.status}`)
await writeFile('public/fonts/OFL.txt', await license.text())
console.log(`Vendored Roboto Mono: ${urls.length} font files`)
