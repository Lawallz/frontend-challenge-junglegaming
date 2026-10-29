import { describe, expect, it } from 'vitest'
import { getResponse, HttpHandler } from 'msw'
import { handlers } from './index'

const httpHandlers = handlers.filter((handler): handler is HttpHandler => handler instanceof HttpHandler)

describe('lazy MSW routing', () => {
  it('passes through public artwork without bypassing generated SVG artwork', async () => {
    const staticImage = await getResponse(httpHandlers, new Request('http://localhost/nft-art/figma-ape-green-640.webp'))
    expect(staticImage?.headers.get('x-msw-intention')).toBe('passthrough')
    const generatedImage = await getResponse(httpHandlers, new Request('http://localhost/nft-art/test.svg'))
    expect(generatedImage?.headers.get('content-type')).toBe('image/svg+xml')
  })

  it('still resolves catalog REST requests through the original handlers', async () => {
    const response = await getResponse(httpHandlers, new Request('http://localhost/api/nfts/nft-005'))
    expect(response?.status).toBe(200)
    expect(await response?.json()).toMatchObject({ id: 'nft-005', name: 'Tiny Voyager' })
    const missing = await getResponse(httpHandlers, new Request('http://localhost/api/nfts/missing'))
    expect(missing?.status).toBe(404)
  })
})
