import type { ImgHTMLAttributes } from 'react'

/** Responsive encodings of original artwork; other API image URLs remain intact. */
export function NftArtwork({ src, sizes = '(max-width: 767px) 50vw, 280px', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const base = src?.match(/^\/nft-art\/(figma-ape-(?:green|violet|sage|gold))\.png$/)?.[1]
  return <img {...props} src={base ? `/nft-art/${base}-640.webp` : src}
    srcSet={base ? [320, 640, 1024].map(width => `/nft-art/${base}-${width}.webp ${width}w`).join(', ') : undefined}
    sizes={base ? sizes : undefined} />
}
