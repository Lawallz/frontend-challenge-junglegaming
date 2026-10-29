import { expect, test } from '@playwright/test'

function email() {
  return `collector-${Date.now()}-${Math.random().toString(36).slice(2)}@kurio.art`
}

async function register(page: import('@playwright/test').Page, address = email(), username = 'Colecionador') {
  await page.goto('/register')
  await page.getByLabel('Nome de usuário').fill(username)
  await page.getByLabel('E-mail').fill(address)
  await page.getByLabel('Senha', { exact: true }).fill('KurioPass123!')
  await page.getByLabel('Confirme sua senha').fill('KurioPass123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem('kurio:session-token')))).toBe(true)
  return address
}

test('cadastro com returnTo, refresh de sessão e conflito de cadastro', async ({ page }) => {
  const address = email()
  await page.goto('/register?returnTo=%2Fnft%2Fnft-002')
  await page.getByLabel('Nome de usuário').fill('Primeira Conta')
  await page.getByLabel('E-mail').fill(address)
  await page.getByLabel('Senha', { exact: true }).fill('KurioPass123!')
  await page.getByLabel('Confirme sua senha').fill('KurioPass123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/nft\/nft-002$/)
  await page.reload()
  await page.goto('/favorites')
  await expect(page.getByText('Primeira Conta')).toBeVisible()

  await page.goto('/register')
  await page.getByLabel('Nome de usuário').fill('Outra Conta')
  await page.getByLabel('E-mail').fill(address)
  await page.getByLabel('Senha', { exact: true }).fill('KurioPass123!')
  await page.getByLabel('Confirme sua senha').fill('KurioPass123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('alert')).toContainText('Já existe uma conta')
})

test('login rejeita credenciais inválidas, permite login demo e logout', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('demo@kurio.art')
  await page.getByLabel('Senha').fill('senha-incorreta')
  await page.getByRole('button', { name: 'Entrar na Kurio' }).click()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos')

  await page.getByLabel('Senha').fill('KurioDemo123!')
  await page.getByRole('button', { name: 'Entrar na Kurio' }).click()
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem('kurio:session-token')))).toBe(true)
  await page.goto('/favorites')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('kurio:session-token'))).toBeNull()
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Ffavorites/)
})

test('sessão expirada encaminha ao login com aviso', async ({ page }) => {
  await register(page)
  await page.evaluate(() => {
    const token = sessionStorage.getItem('kurio:session-token')
    const raw = localStorage.getItem('kurio:mock:auth:v1')
    if (!token || !raw) throw new Error('Sessão mock não foi persistida')
    const state = JSON.parse(raw)
    state.sessions[token].expiresAt = new Date(0).toISOString()
    localStorage.setItem('kurio:mock:auth:v1', JSON.stringify(state))
    sessionStorage.setItem('kurio:session-expires-at', new Date(0).toISOString())
  })
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Ffavorites&reason=expired/)
  await expect(page.getByRole('status')).toContainText('Sua sessão expirou')
})

test('favoritos persistem após refresh e permanecem isolados ao trocar de usuário', async ({ page }) => {
  const firstEmail = await register(page, email(), 'Conta Um')
  await page.goto('/nft/nft-002')
  const favorite = page.getByRole('button', { name: 'Adicionar nft-002 aos favoritos' })
  await favorite.click()
  await expect(page.getByRole('button', { name: 'Remover nft-002 dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remover nft-002 dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/favorites')
  await expect(page.getByText('Golden Hour')).toBeVisible()
  const firstSessionToken = await page.evaluate(() => sessionStorage.getItem('kurio:session-token'))
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('kurio:session-token'))).toBeNull()

  await register(page, email(), 'Conta Dois')
  const secondSessionToken = await page.evaluate(() => sessionStorage.getItem('kurio:session-token'))
  expect(secondSessionToken).not.toBe(firstSessionToken)
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem('kurio:session-token')))).toBe(true)
  await page.goto('/favorites')
  await expect(page.getByText('Ainda não há favoritos')).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(firstEmail)
  await page.getByLabel('Senha').fill('KurioPass123!')
  await page.getByRole('button', { name: 'Entrar na Kurio' }).click()
  await expect(page).toHaveURL(/\/(?:\?.*)?$/)
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('kurio:session-token'))).not.toBe(secondSessionToken)
  await page.goto('/favorites')
  await expect(page.getByText('Golden Hour')).toBeVisible()
})

test('favorito anônimo preserva caminho interno de retorno ao login', async ({ page }) => {
  await page.goto('/nft/nft-002')
  await page.getByRole('link', { name: 'Entre para adicionar aos favoritos' }).click()
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fnft%2Fnft-002/)
})
