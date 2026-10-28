import type { Nft, NftNetwork } from '@/shared/api/contracts'
import type { EthAmount } from '@/shared/lib/eth'

interface NftSeed {
  id: string; tokenId: string; name: string; collection: string; category: string
  price: string; network: NftNetwork; createdAt: string; popularity: number
}

const seeds: NftSeed[] = [
  { id: 'nft-001', tokenId: '#0001', name: 'Blue Bird', collection: 'Digital Dreams', category: 'Arte digital', price: '0.02', network: 'ethereum-mainnet', createdAt: '2026-10-20T10:00:00.000Z', popularity: 99 },
  { id: 'nft-002', tokenId: '#0002', name: 'Golden Hour', collection: 'Light Studies', category: 'Fotografia', price: '0.35', network: 'polygon', createdAt: '2026-10-19T10:00:00.000Z', popularity: 85 },
  { id: 'nft-003', tokenId: '#0003', name: 'Synth Bloom', collection: 'Sound Garden', category: 'Música', price: '1.2', network: 'solana', createdAt: '2026-10-18T10:00:00.000Z', popularity: 92 },
  { id: 'nft-004', tokenId: '#0004', name: 'Orbit Form', collection: 'New Dimensions', category: 'Arte 3D', price: '2.4', network: 'ethereum-mainnet', createdAt: '2026-10-17T10:00:00.000Z', popularity: 77 },
  { id: 'nft-005', tokenId: '#0005', name: 'Tiny Voyager', collection: 'Pocket Worlds', category: 'Colecionáveis', price: '0.08', network: 'polygon', createdAt: '2026-10-16T10:00:00.000Z', popularity: 68 },
  { id: 'nft-006', tokenId: '#0006', name: 'Infinite Garden', collection: 'Generative Garden', category: 'Generativa', price: '12.3', network: 'ethereum-mainnet', createdAt: '2026-10-15T10:00:00.000Z', popularity: 98 },
  { id: 'nft-007', tokenId: '#0007', name: 'Pixel Rally', collection: 'Arcade Archive', category: 'Jogos', price: '0.5', network: 'solana', createdAt: '2026-10-14T10:00:00.000Z', popularity: 81 },
  { id: 'nft-008', tokenId: '#0008', name: 'Studio Pass', collection: 'Open Studio', category: 'Assinaturas', price: '3.15', network: 'polygon', createdAt: '2026-10-13T10:00:00.000Z', popularity: 64 },
  { id: 'nft-009', tokenId: '#0009', name: 'Open Door', collection: 'Access Keys', category: 'Utilidade', price: '0.12', network: 'ethereum-mainnet', createdAt: '2026-10-12T10:00:00.000Z', popularity: 74 },
  { id: 'nft-010', tokenId: '#0010', name: 'Red Horizon', collection: 'Digital Dreams', category: 'Arte digital', price: '5.4', network: 'polygon', createdAt: '2026-10-11T10:00:00.000Z', popularity: 88 },
  { id: 'nft-011', tokenId: '#0011', name: 'Quiet Coast', collection: 'Light Studies', category: 'Fotografia', price: '0.75', network: 'solana', createdAt: '2026-10-10T10:00:00.000Z', popularity: 70 },
  { id: 'nft-012', tokenId: '#0012', name: 'Soft Signal', collection: 'Sound Garden', category: 'Música', price: '8.1', network: 'ethereum-mainnet', createdAt: '2026-10-09T10:00:00.000Z', popularity: 91 },
  { id: 'nft-013', tokenId: '#0013', name: 'Cloud Machine', collection: 'New Dimensions', category: 'Arte 3D', price: '1.8', network: 'polygon', createdAt: '2026-10-08T10:00:00.000Z', popularity: 73 },
  { id: 'nft-014', tokenId: '#0014', name: 'Moss Sprite', collection: 'Pocket Worlds', category: 'Colecionáveis', price: '0.03', network: 'ethereum-mainnet', createdAt: '2026-10-07T10:00:00.000Z', popularity: 62 },
  { id: 'nft-015', tokenId: '#0015', name: 'Prism Logic', collection: 'Generative Garden', category: 'Generativa', price: '6.25', network: 'solana', createdAt: '2026-10-06T10:00:00.000Z', popularity: 96 },
  { id: 'nft-016', tokenId: '#0016', name: 'Pixel Sprint', collection: 'Arcade Archive', category: 'Jogos', price: '0.22', network: 'polygon', createdAt: '2026-10-05T10:00:00.000Z', popularity: 79 },
  { id: 'nft-017', tokenId: '#0017', name: 'Member Number One', collection: 'Open Studio', category: 'Assinaturas', price: '9.5', network: 'ethereum-mainnet', createdAt: '2026-10-04T10:00:00.000Z', popularity: 60 },
  { id: 'nft-018', tokenId: '#0018', name: 'Safe Passage', collection: 'Access Keys', category: 'Utilidade', price: '0.04', network: 'solana', createdAt: '2026-10-03T10:00:00.000Z', popularity: 83 },
]

export const nftFixtures: Nft[] = seeds.map((seed, index) => ({
  id: seed.id,
  tokenId: seed.tokenId,
  name: seed.name,
  collection: { id: seed.category.toLowerCase().replaceAll(' ', '-'), name: seed.category },
  description: `${seed.name}, uma peça de ${seed.category.toLowerCase()} da coleção ${seed.collection}.`,
  price: seed.price as EthAmount,
  previousPrice: null,
  images: [{ id: `${seed.id}-image`, url: `/nft-art/${['figma-ape-green.png', 'figma-ape-violet.png', 'figma-ape-sage.png', 'figma-ape-gold.png'][index % 4]}`, alt: `${seed.name}, obra de ${seed.category.toLowerCase()}` }],
  editions: [{ id: `${seed.id}-edition-1`, label: '1/1', supply: 1, available: index % 7 === 0 ? 0 : 1 }],
  attributes: [seed.category, seed.collection],
  rarity: null,
  rating: { average: 4.5 + (index % 5) / 10, count: 12 + index * 3 },
  royaltyPercent: '5',
  chain: { network: seed.network, contractAddress: `0x${(index + 1).toString(16).padStart(40, '0')}`, standard: 'ERC-721', metadataStorage: 'ipfs' },
  createdAt: seed.createdAt,
  version: 1,
}))

export const nftFixtureMetadata = new Map(seeds.map((seed) => [seed.id, { category: seed.category, popularity: seed.popularity }]))

