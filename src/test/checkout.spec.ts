import { expect, test } from '@playwright/test'

async function addOpenEdition(page: import('@playwright/test').Page, quantity = 1) {
  await page.goto('/nft/nft-005')
  await page.getByLabel('Edição').selectOption('nft-005-edition-2')
  for (let index = 1; index < quantity; index += 1) await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Item adicionado ao carrinho.', { exact: true })).toBeVisible()
}

async function loginDemo(page: import('@playwright/test').Page, returnTo = '/checkout') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page.getByLabel('E-mail').fill('demo@kurio.art')
  await page.getByLabel('Senha').fill('KurioDemo123!')
  await page.getByRole('button', { name: 'Entrar na Kurio' }).click()
  await expect(page).toHaveURL(/\/checkout(?:\?.*)?$/)
}

async function prepareCheckout(page: import('@playwright/test').Page, quantity = 1) {
  await addOpenEdition(page, quantity)
  await loginDemo(page)
  await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
  await page.goto('/wallets')
  await page.getByLabel('Nome', { exact: true }).fill('Carteira de teste')
  await page.getByLabel('Endereço').fill('0x' + 'a'.repeat(40))
  const response = page.waitForResponse((entry) => entry.url().includes('/wallets') && entry.request().method() === 'POST')
  await page.getByRole('button', { name: 'Adicionar carteira' }).click()
  expect((await response).status()).toBe(201)
  await page.goto('/checkout')
  await expect(page.getByLabel('Carteira')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
}

test('checkout cria pedido pendente, limpa carrinho e confirmação continua após refresh', async ({ page }) => {
  await prepareCheckout(page)
  await page.getByRole('button', { name: 'Simular recusa' }).click()
  await expect(page.getByRole('status')).toContainText('recusada')
  await page.getByRole('button', { name: 'Simular conexão' }).click()
  await expect(page.getByRole('status')).toContainText('conectada')
  await page.getByRole('button', { name: 'Desconectar' }).click()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
  await expect(page.getByText('Pendente', { exact: true })).toBeVisible()
  await expect(page.getByText(/blockchain/)).toBeVisible()
  const orderId = await page.locator('.order-number strong').textContent()
  expect(orderId).toMatch(/^order-/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
  await expect(page.locator('.order-number strong')).toHaveText(orderId!)
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('falha temporária preserva carrinho e só permite retry após resposta', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'checkout-failure'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('alert')).toContainText('pedido agora')
  await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.goto('/cart')
  await expect(page.locator('.cart-item')).toHaveCount(1)
})

test('estoque alterado no servidor impede pedido e mantém o carrinho', async ({ page }) => {
  await prepareCheckout(page, 2)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'checkout-stock-changed'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('alert')).toContainText('O estoque mudou')
  await expect(page).toHaveURL(/\/checkout$/)
  await page.goto('/cart')
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
})

test('duplo clique durante resposta lenta cria apenas um pedido', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'checkout-resilience'))
  const confirm = page.getByRole('button', { name: 'Confirmar pedido' })
  await confirm.dblclick()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible({ timeout: 10_000 })
  const orders = await page.evaluate(() => JSON.parse(localStorage.getItem('kurio:mock:orders:v1') ?? '{"orders":{}}').orders)
  expect(Object.keys(orders)).toHaveLength(1)
})

test('atualização nft.updated durante checkout invalida cotação e exige revisão', async ({ page }) => {
  await addOpenEdition(page)
  await loginDemo(page)
  await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'realtime-price-update'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('atualizado', { timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Aceitar novos preços e recalcular' })).toBeVisible()
  await page.getByRole('button', { name: 'Aceitar novos preços e recalcular' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('pedido só confirma após order.updated e resultados terminais persistem', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'realtime-order-confirmed'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
})

test('pedido recusado permanece terminal após order.updated', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'realtime-order-declined'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido recusado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Recusado', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pedido recusado' })).toBeVisible()
})

test('eventos repetidos e antigos não regridem pedido terminal', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'realtime-order-duplicate'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible()
})

test('pedido retoma após desconexão Socket.IO e reconciliação REST', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'realtime-disconnect'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 15_000 })
})
test('pedido pendente retoma por REST após refresh e atualiza pelo servidor simulado', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => localStorage.setItem('kurio:mock:scenario', 'realtime-order-pending'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
  const orderId = await page.locator('.order-number strong').textContent()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.order-number strong')).toHaveText(orderId!)
})
