import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Testes unitários (lógica pura). E2E fica em src/test e roda no Playwright.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/test/**', 'node_modules/**'],
  },
})
