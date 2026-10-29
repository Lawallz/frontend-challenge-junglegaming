import { enableMocks } from '@/mocks/enable-mocks'
import './styles/globals.css'

// The homepage hero is a static design asset; start its responsive request before
// loading the catalog module. Other routes do not download an unused hero.
if (window.location.pathname === '/') {
  const hero = document.createElement('link')
  hero.rel = 'preload'
  hero.as = 'image'
  hero.href = '/nft-art/figma-ape-green-640.webp'
  hero.imageSrcset = [320, 640, 1024].map(width => `/nft-art/figma-ape-green-${width}.webp ${width}w`).join(', ')
  hero.imageSizes = '(max-width: 767px) 160px, 282px'
  hero.fetchPriority = 'high'
  document.head.append(hero)
}

// Fetch application code and install interceptors concurrently. Rendering and
// all REST/Socket.IO requests still wait for MSW to become ready.
Promise.all([enableMocks(), import('./render')]).then(([, { renderApp }]) => renderApp())
