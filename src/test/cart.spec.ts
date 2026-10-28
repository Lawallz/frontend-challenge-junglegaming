import { expect, test } from '@playwright/test'

async function addOpenEdition(page: import('@playwright/test').Page) {
  await page.goto('/nft/nft-005')
  await page.getByLabel('Edição').selectOption('nft-005-edition-2')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Item adicionado ao carrinho.', { exact: true })).toBeVisible()
}

async function loginDemo(page: import('@playwright/test').Page) {
  await page.goto('/login?returnTo=%2Fcart')
  await page.getByLabel('E-mail').fill('demo@kurio.art')
  await page.getByLabel('Senha').fill('KurioDemo123!')
  await page.getByRole('button', { name: 'Entrar na Kurio' }).click()
  await expect(page).toHaveURL(/\/cart(?:\?.*)?$/)
}

test('adiciona, altera, persiste e remove itens respeitando o estoque', async ({ page }) => {
  await addOpenEdition(page)
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'Tiny Voyager #0005' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar Tiny Voyager' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await expect(page.locator('.cart-items-column .cart-line-total')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await page.getByRole('button', { name: 'Aumentar Tiny Voyager' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('3')
  await expect(page.getByRole('button', { name: 'Aumentar Tiny Voyager' })).toBeDisabled()
  await page.locator('.cart-mobile-remove:visible, .cart-remove:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('mescla carrinho visitante ao entrar e soma a mesma edição sem duplicar linhas', async ({ page }) => {
  await addOpenEdition(page)
  await loginDemo(page)
  await expect(page.getByRole('link', { name: 'Tiny Voyager #0005' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')

  await page.goto('/favorites')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('kurio:session-token'))).toBeNull()
  await addOpenEdition(page)
  await loginDemo(page)

  await expect(page.locator('.cart-item')).toHaveCount(1)
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
})

test('aplica cupom válido e mostra respostas para códigos inválidos e expirados', async ({ page }) => {
  await addOpenEdition(page)
  await page.goto('/cart')
  await page.getByLabel('Cupom de desconto').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10')).toBeVisible()
  await expect(page.locator('.cart-summary-row.cart-discount')).toContainText('0.008 ETH')

  await page.getByLabel('Cupom de desconto').fill('CUPOM-INVALIDO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toContainText('Cupom inválido')
  await expect(page.getByText('Cupom KURIO10')).toBeVisible()

  await page.getByLabel('Cupom de desconto').fill('KURIOEXPIRED')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toContainText('cupom expirou')
})

test('exibe o estado vazio e oferece retorno ao mercado', async ({ page }) => {
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  await page.getByRole('link', { name: 'Explorar NFTs' }).click()
  await expect(page).toHaveURL(/\//)
  await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
})
