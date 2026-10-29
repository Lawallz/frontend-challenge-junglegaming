import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Preserve originals and encode delivery variants of the same artwork.
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const color of ['green', 'violet', 'sage', 'gold']) {
    const name = `figma-ape-${color}`
    const source = await readFile(`public/nft-art/${name}.png`)
    for (const width of [320, 640, 1024]) {
      const encoded = await page.evaluate(async ({ source, width }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${source}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = Math.round(image.naturalHeight * width / image.naturalWidth)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/webp', 0.94).split(',')[1]
      }, { source: source.toString('base64'), width })
      const bytes = Buffer.from(encoded, 'base64')
      await writeFile(`public/nft-art/${name}-${width}.webp`, bytes)
      console.log(`${name}-${width}.webp: ${bytes.length} bytes (original ${source.length})`)
    }
  }
} finally {
  await browser.close()
}
