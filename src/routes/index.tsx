import { createFileRoute } from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { parseNftListQuery } from '@/shared/api/contracts'

export const Route = createFileRoute('/')({
  validateSearch: (search) => parseNftListQuery(new URLSearchParams(Object.entries(search).flatMap(([key, value]) => Array.isArray(value) ? value.map((item) => [key, String(item)]) : value === undefined ? [] : [[key, String(value)]]))),
  component: CatalogPage,
})
