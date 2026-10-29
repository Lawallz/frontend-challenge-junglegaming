import { expect, test } from '@playwright/test'

const viewports = [390, 768, 1440] as const

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth).catch(() => false), { timeout: 10000 }).toBe(true)
}

for (const width of viewports) {
  test(`regressão visual e reflow em ${width}px`, async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'As larguras são exercitadas no Chromium desktop em uma única matriz visual.')
    test.setTimeout(90000)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /SEJA DONO/ }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect(page).toHaveScreenshot(`inicio-${width}.png`, { animations: 'disabled', timeout: 15000, maxDiffPixelRatio: 0.015 })

    await page.goto('/nft/nft-005')
    await expect(page.getByRole('heading', { name: /Tiny Voyager/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect(page).toHaveScreenshot(`detalhe-${width}.png`, { animations: 'disabled', timeout: 15000, maxDiffPixelRatio: 0.015 })

    await page.getByLabel('Edição').selectOption('nft-005-edition-2')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByText('Item adicionado ao carrinho.')).toBeVisible()
    await page.goto('/cart')
    await expect(page.getByRole('heading', { name: /Seu carrinho/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect(page).toHaveScreenshot(`carrinho-${width}.png`, { animations: 'disabled', timeout: 15000, maxDiffPixelRatio: 0.015 })

    for (const route of ['/login', '/register']) {
      await page.goto(route)
      await expectNoHorizontalOverflow(page)
    }
    await page.goto('/login?returnTo=%2Fcheckout')
    await page.getByLabel('E-mail').fill('demo@kurio.art')
    await page.getByLabel('Senha').fill('KurioDemo123!')
    await page.getByRole('button', { name: 'Entrar na Kurio' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await page.goto('/wallets')
    await page.getByLabel('Nome', { exact: true }).fill('Carteira visual')
    await page.getByLabel('Endereço').fill(`0x${String(width).padStart(40, '0')}`)
    await page.getByRole('button', { name: 'Adicionar carteira' }).click()
    await expect(page.getByText('Carteira visual')).toBeVisible()
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect(page).toHaveScreenshot(`checkout-${width}.png`, { animations: 'disabled', timeout: 15000, maxDiffPixelRatio: 0.015 })

    for (const route of ['/profile', '/orders', '/wallets']) {
      await page.goto(route)
      if (route === '/profile' || route === '/orders' || route === '/wallets') await expect(page.getByRole('heading', { name: /Meu perfil|Meus pedidos|Minhas carteiras/ })).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }
    await page.goto('/checkout')
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
}

test('drawer de filtros mantém foco e pode ser fechado pelo teclado', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium-desktop', 'O drawer é testado uma vez no Chromium desktop com viewport mobile.')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Abrir filtros' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const drawer = page.getByRole('dialog', { name: 'Filtros do catálogo' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Fechar filtros' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
