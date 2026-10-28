import { http, HttpResponse } from 'msw'

/** Deterministic local SVG artwork for demo image paths. */
export const assetHandlers = [
  http.get('/nft-art/:id.svg', ({ params }) => {
    const hue = [...String(params.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue} 70% 25%)"/><stop offset="1" stop-color="hsl(${(hue + 100) % 360} 80% 65%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="320" cy="220" r="115" fill="none" stroke="white" stroke-opacity=".8" stroke-width="8"/><path d="M100 390 280 245l110 80 90-120 90 185" fill="none" stroke="white" stroke-opacity=".65" stroke-width="14"/></svg>`
    return new HttpResponse(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
  }),
]
