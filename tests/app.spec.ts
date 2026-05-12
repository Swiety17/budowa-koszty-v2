import { test, expect, type Page } from '@playwright/test'

const BASE  = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const EMAIL = 'e2e-test@budowa-koszty.test'
const PASS  = 'E2eTestPass99!'

/* ─── helpers ─────────────────────────────────────────────── */

async function login(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 15_000 })
}

async function createProject(page: Page, name: string, budget?: string): Promise<string> {
  await page.goto(`${BASE}/projects/new`)
  await page.fill('input[name="name"]', name)
  if (budget) await page.fill('input[name="budget"]', budget)
  await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
  await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })
  return page.url().split('/projects/')[1]
}

async function addCost(page: Page, projectId: string, name: string, amount: string, vendor?: string) {
  await page.goto(`${BASE}/projects/${projectId}/costs/new`)
  await page.fill('#amount', amount)
  await page.fill('#name', name)
  if (vendor) {
    // Chip "+ Wykonawca" — klikamy żeby rozwinąć VendorInput
    await page.locator('button', { hasText: 'Wykonawca' }).click()
    await page.locator('#vendor').waitFor()
    await page.fill('#vendor', vendor)
  }
  await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
  await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })
}

/* ─── Auth ────────────────────────────────────────────────── */

test.describe('Auth', () => {

  test('01 — strona główna przekierowuje na /login', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveURL(/\/login/)
    await page.screenshot({ path: 'tests/screenshots/01-redirect.png' })
  })

  test('02 — logowanie → dashboard widoczny', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('heading', { name: 'Moje budowy' })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/02-dashboard.png' })
  })

  test('03 — błędne hasło: toast z błędem, email zachowany', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', 'ZleHaslo_!@#999')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Invalid login credentials')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('input[type="email"]')).toHaveValue(EMAIL)
    await page.screenshot({ path: 'tests/screenshots/03-invalid-login.png' })
  })

  test('04 — wylogowanie → powrót na /login', async ({ page }) => {
    await login(page)
    // Przycisk wylogowania w sidebarze
    await page.locator('aside').getByRole('button', { name: /Wyloguj/ }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
    await page.screenshot({ path: 'tests/screenshots/04-logout.png' })
  })

})

/* ─── Budowy (CRUD) ───────────────────────────────────────── */

test.describe('Budowy — CRUD', () => {

  test('05 — tworzenie nowej budowy z budżetem', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Budowa Testowa E2E', '250000')
    await expect(page.getByRole('heading', { name: 'Budowa Testowa E2E' })).toBeVisible()
    await expect(page.getByText('250 000')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/05-project-created.png' })

    // Sprzątanie
    await page.locator('button:has(.lucide-trash2)').click()
    await expect(page.getByRole('heading', { name: 'Usuń budowę' })).toBeVisible()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('06 — walidacja: pusta nazwa blokuje formularz', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/projects/new`)
    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await expect(page.getByText('Nazwa jest wymagana')).toBeVisible()
    await expect(page).toHaveURL(/\/projects\/new/)
    await page.screenshot({ path: 'tests/screenshots/06-validation-name.png' })
  })

  test('07 — edycja nazwy projektu przez Sheet (bez reload)', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt do Edycji')

    const heading = page.getByRole('heading', { level: 1 })
    await page.locator('button:has(.lucide-pencil)').first().click()

    const nameInput = page.getByLabel('Nazwa')
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill('Projekt Zmieniony')
    await page.getByRole('button', { name: /Zapisz zmiany/ }).click()

    await expect(nameInput).not.toBeVisible({ timeout: 5_000 })
    await expect(heading).toHaveText('Projekt Zmieniony')
    await page.screenshot({ path: 'tests/screenshots/07-edit-project.png' })

    // Sprzątanie
    await page.locator('button:has(.lucide-trash2)').click()
    await expect(page.getByRole('heading', { name: 'Usuń budowę' })).toBeVisible()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('08 — usunięcie budowy: dialog potwierdza, przekierowanie na dashboard', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Budowa do Usunięcia')

    await page.locator('button:has(.lucide-trash2)').click()
    await expect(page.getByRole('heading', { name: 'Usuń budowę' })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/08-delete-dialog.png' })

    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
    await expect(page.getByText('Budowa do Usunięcia')).not.toBeVisible()
  })

  test('09 — 404 na nieistniejącym projekcie', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE}/projects/00000000-0000-0000-0000-000000000000`)
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/09-not-found.png' })
  })

})

/* ─── Koszty (CRUD) ───────────────────────────────────────── */

test.describe('Koszty — CRUD', () => {

  test('10 — dodanie kosztu: pojawia się na liście', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt z Kosztami')
    await addCost(page, projectId, 'Cegły pełne', '4500', 'Budmax')

    await expect(page.getByText('Cegły pełne')).toBeVisible()
    await expect(page.locator('p.tabular-nums').filter({ hasText: /4500/ }).first()).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/10-cost-added.png' })

    // Sprzątanie projektu
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('11 — walidacja kosztu: brak kwoty blokuje formularz', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Walidacja Kosztów')
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)

    await page.fill('#name', 'Koszt bez kwoty')
    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    await expect(page.getByText('Wymagana')).toBeVisible()
    await expect(page).toHaveURL(/\/costs\/new/)
    await page.screenshot({ path: 'tests/screenshots/11-cost-validation.png' })

    // Sprzątanie
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('12 — edycja kosztu przez DropdownMenu → Sheet', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Edycja Kosztu')
    await addCost(page, projectId, 'Piasek budowlany', '800')
    await page.goto(`${BASE}/projects/${projectId}`)

    const costRow = page.locator('div.divide-y > div').first()
    await costRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Edytuj/ }).click()

    await expect(page.getByRole('heading', { name: 'Edytuj koszt' })).toBeVisible()
    const nameInput = page.locator('#ec-name')
    await expect(nameInput).toHaveValue('Piasek budowlany')
    await nameInput.fill('Piasek budowlany (zmieniony)')
    await page.getByRole('button', { name: /Zapisz zmiany/ }).click()

    await expect(page.getByText('Koszt zaktualizowany')).toBeVisible()
    await expect(page.getByText('Piasek budowlany (zmieniony)')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/12-cost-edited.png' })

    // Sprzątanie
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('13 — usunięcie kosztu przez Dialog', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Usuwanie Kosztu')
    await addCost(page, projectId, 'Cement Portland', '1200')
    await page.goto(`${BASE}/projects/${projectId}`)

    const costRow = page.locator('div.divide-y > div').first()
    await costRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Usuń/ }).click()

    await expect(page.getByRole('heading', { name: 'Usuń koszt' })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/13-cost-delete-dialog.png' })
    await page.getByRole('button', { name: /^Usuń$/ }).click()

    await expect(page.getByText('Koszt usunięty')).toBeVisible()
    await expect(page.getByText('Cement Portland')).not.toBeVisible()

    // Sprzątanie projektu
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

})

/* ─── Filtrowanie i UI ────────────────────────────────────── */

test.describe('Filtrowanie i UI', () => {

  test('14 — wyszukiwarka: filtruje koszty, reset przywraca wszystkie', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Wyszukiwarka')
    await addCost(page, projectId, 'Dachówka ceramiczna', '9000', 'Roben')
    await addCost(page, projectId, 'Okna PVC', '15000', 'Internorm')
    await page.goto(`${BASE}/projects/${projectId}`)

    const search = page.locator('input[placeholder*="Szukaj kosztów"]')
    const rows = page.locator('div.divide-y > div')

    await expect(rows).toHaveCount(2)

    await search.fill('Dachówka')
    await expect(rows).toHaveCount(1)
    await expect(page.getByText('Dachówka ceramiczna')).toBeVisible()

    // Reset przez X
    await page.locator('button:has(.lucide-x)').click()
    await expect(rows).toHaveCount(2)
    await page.screenshot({ path: 'tests/screenshots/14-search.png' })

    // Sprzątanie
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('15 — pasek budżetu na dashboardzie gdy projekt ma budżet', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt z Budżetem', '10000')
    await addCost(page, projectId, 'Fundamenty', '6000')
    await page.goto(`${BASE}/dashboard`)

    const card = page.locator(`a[href="/projects/${projectId}"]`)
    await expect(card.getByText(/% z/)).toBeVisible()
    await expect(card.locator('.h-1\\.5')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/15-budget-bar.png' })

    // Sprzątanie
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('16 — dark mode: toggle przełącza klasę i persystuje po reload', async ({ page }) => {
    await login(page)

    const isDark = () => page.evaluate(() =>
      document.documentElement.classList.contains('dark'))

    const before = await isDark()
    const themeBtn = page.locator('aside').getByRole('button').filter({
      has: page.locator('.lucide-sun, .lucide-moon'),
    }).first()
    await expect(themeBtn).toBeVisible()
    await themeBtn.click()
    await expect.poll(isDark).toBe(!before)

    await page.reload({ waitUntil: 'domcontentloaded' })
    expect(await isDark()).toBe(!before)
    await page.screenshot({ path: 'tests/screenshots/16-dark-mode.png' })

    // Przywróć
    await themeBtn.click()
    await expect.poll(isDark).toBe(before)
  })

  test('17 — brak migotania: dark mode z localStorage aktywny przed hydracją', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'domcontentloaded' })

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'))
    expect(isDark).toBe(true)
    await page.screenshot({ path: 'tests/screenshots/17-no-flash.png' })

    await page.evaluate(() => localStorage.removeItem('theme'))
  })

  test('18 — mobile 390px: BottomNav widoczny, sidebar ukryty', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page)

    await expect(page.locator('aside')).not.toBeVisible()
    await expect(page.locator('nav.fixed')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/18-mobile-nav.png' })
  })

  test('19 — mobile 390px: FAB wskazuje na /costs/new na stronie projektu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page)
    const projectId = await createProject(page, 'Projekt FAB Mobile')

    const fab = page.locator(`a[href="/projects/${projectId}/costs/new"]`).filter({
      has: page.locator('div.rounded-full'),
    })
    await expect(fab).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/19-mobile-fab.png' })

    // Sprzątanie
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('20 — link "Moje budowy" wraca na dashboard', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Nawigacja')
    await page.getByRole('link', { name: 'Moje budowy' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Sprzątanie
    await page.locator(`a[href="/projects/${projectId}"]`).click()
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

})

/* ─── Nowe funkcjonalności ────────────────────────────────── */

test.describe('Nowe funkcjonalności', () => {

  // ── Redesign formularza: date chips ──────────────────────

  test('21 — chip "Wczoraj" → koszt zapisuje wczorajszą datę', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Chip Wczoraj')

    await page.goto(`${BASE}/projects/${projectId}/costs/new`)
    await page.getByRole('button', { name: 'Wczoraj' }).click()
    await page.fill('#amount', '500')
    await page.fill('#name', 'Koszt z wczoraj')
    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })

    await expect(page.getByText('Koszt z wczoraj')).toBeVisible()

    // Weryfikacja daty przez sheet edycji
    const costRow = page.locator('div.divide-y > div').first()
    await costRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Edytuj/ }).click()

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const expectedDate = yesterday.toISOString().split('T')[0]
    await expect(page.locator('#ec-date')).toHaveValue(expectedDate)
    await page.screenshot({ path: 'tests/screenshots/21-date-yesterday.png' })

    // Sprzątanie
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('22 — chip "Inna data…" → date picker pojawia się, data persystuje', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Inna Data')
    const customDate = '2025-03-15'

    await page.goto(`${BASE}/projects/${projectId}/costs/new`)
    await page.getByRole('button', { name: 'Inna data…' }).click()

    // Pole date pojawia się
    const datePicker = page.locator('input[type="date"]')
    await expect(datePicker).toBeVisible()
    await datePicker.fill(customDate)

    await page.fill('#amount', '1200')
    await page.fill('#name', 'Koszt historyczny')
    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })

    await expect(page.getByText('Koszt historyczny')).toBeVisible()

    // Weryfikacja daty przez edit sheet
    const costRow = page.locator('div.divide-y > div').first()
    await costRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Edytuj/ }).click()
    await expect(page.locator('#ec-date')).toHaveValue(customDate)
    await page.screenshot({ path: 'tests/screenshots/22-custom-date.png' })

    // Sprzątanie
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Chip "Dzisiaj" jest domyślnie zaznaczony ──────────────

  test('23 — chip "Dzisiaj" zaznaczony domyślnie, koszt ma dzisiejszą datę', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Chip Dzisiaj')
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)

    // "Dzisiaj" powinno mieć styl aktywny (bg-foreground)
    const todayBtn = page.getByRole('button', { name: 'Dzisiaj' })
    await expect(todayBtn).toHaveClass(/bg-foreground/)

    await page.fill('#amount', '300')
    await page.fill('#name', 'Koszt dzisiaj')
    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })

    const costRow = page.locator('div.divide-y > div').first()
    await costRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Edytuj/ }).click()
    await expect(page.locator('#ec-date')).toHaveValue(new Date().toISOString().split('T')[0])
    await page.screenshot({ path: 'tests/screenshots/23-date-today.png' })

    // Sprzątanie
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Chip "+ Uwagi" ────────────────────────────────────────

  test('24 — chip "+ Dodaj uwagi" toggle: textarea pojawia się, notatka persystuje', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Uwagi')
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)

    // Textarea domyślnie ukryta
    await expect(page.locator('#notes')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Dodaj uwagi/ })).toBeVisible()

    // Klik expanduje
    await page.getByRole('button', { name: /Dodaj uwagi/ }).click()
    await expect(page.locator('#notes')).toBeVisible()

    await page.fill('#notes', 'Faktura VAT nr 123/2025')
    await page.fill('#amount', '750')
    await page.fill('#name', 'Materiały z notatką')
    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })

    // Weryfikacja przez edit sheet
    const costRow = page.locator('div.divide-y > div').first()
    await costRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Edytuj/ }).click()
    await expect(page.locator('#ec-notes')).toHaveValue('Faktura VAT nr 123/2025')
    await page.screenshot({ path: 'tests/screenshots/24-notes.png' })

    // Sprzątanie
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Chip "+ Wykonawca" ────────────────────────────────────

  test('25 — chip "+ Wykonawca" expand/collapse: X usuwa pole i czyści wartość', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Chip Wykonawca')
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)

    // Input ukryty domyślnie
    await expect(page.locator('#vendor')).not.toBeVisible()

    // Expand
    await page.locator('button', { hasText: 'Wykonawca' }).click()
    await page.locator('#vendor').waitFor()
    await page.fill('#vendor', 'Firma Test')

    // X na active chipie chowa input
    await page.locator('span', { hasText: 'Firma Test' }).locator('button').click()
    await expect(page.locator('#vendor')).not.toBeVisible()

    // Chip "+ Wykonawca" ponownie widoczny
    await expect(page.locator('button', { hasText: 'Wykonawca' })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/25-vendor-chip-toggle.png' })

    // Sprzątanie
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Vendor filter w CostList ──────────────────────────────

  test('26 — vendor pills w CostList: filtrowanie i toggle', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Vendor Filter')
    await addCost(page, projectId, 'Cegły', '2000', 'Budmax')
    await addCost(page, projectId, 'Piasek', '800', 'Budmax')
    await addCost(page, projectId, 'Okna', '12000', 'Internorm')
    await page.goto(`${BASE}/projects/${projectId}`)

    // Vendor pills widoczne z kwotami
    await expect(page.locator('button', { hasText: 'Budmax' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Internorm' })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/26-vendor-pills.png' })

    // Kliknięcie Budmax filtruje
    await page.locator('button', { hasText: 'Budmax' }).click()
    await expect(page.getByText('Cegły')).toBeVisible()
    await expect(page.getByText('Piasek')).toBeVisible()
    await expect(page.getByText('Okna')).not.toBeVisible()

    // Kliknięcie ponownie odpina filtr
    await page.locator('button', { hasText: 'Budmax' }).click()
    await expect(page.getByText('Okna')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/26b-vendor-filter-cleared.png' })

    // Sprzątanie
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Vendor autocomplete ───────────────────────────────────

  test('27 — vendor autocomplete podpowiada istniejącego wykonawcę', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Autocomplete')
    await addCost(page, projectId, 'Tynki', '3000', 'CemexPolska')

    // Nowy koszt — autocomplete powinno zaproponować CemexPolska
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)
    await page.locator('button', { hasText: 'Wykonawca' }).click()
    await page.locator('#vendor').waitFor()
    await page.fill('#vendor', 'Cem')

    await expect(page.getByText('CemexPolska')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: 'tests/screenshots/27-vendor-autocomplete.png' })

    // Sprzątanie
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Etap z budżetem ───────────────────────────────────────

  test('28 — etap z budżetem: mini progress bar i kwoty w zakładce Etapy', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Etap Budżet')

    // Dodaj etap z budżetem przez zakładkę Etapy
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button', { hasText: 'Etapy' }).click()
    await page.getByPlaceholder('np. Stan surowy, Wykończenie…').fill('Fundamenty')
    await page.getByPlaceholder('Brak').fill('20000')
    await page.getByRole('button', { name: 'Dodaj etap' }).click()
    await expect(page.getByText('Fundamenty')).toBeVisible()

    // Dodaj koszt przypisany do etapu
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)
    await page.fill('#amount', '8000')
    await page.fill('#name', 'Beton fundamentowy')

    // Rozwiń chip Etap i wybierz "Fundamenty"
    await page.locator('button', { hasText: 'Etap' }).click()
    await expect(page.getByRole('button', { name: 'Fundamenty' })).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: 'Fundamenty' }).click()
    await expect(page.locator('span.rounded-full', { hasText: 'Fundamenty' })).toBeVisible({ timeout: 3_000 })

    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })

    // Sprawdź zakładkę Etapy — mini progress bar z kwotami
    await page.locator('button', { hasText: 'Etapy' }).click()
    await expect(page.getByText('Fundamenty')).toBeVisible()
    // Spending / budget format: "8 000 zł / 20 000 zł" — unique to StageBudgetMini
    await expect(page.locator('.h-1\\.5')).toBeVisible()  // progress bar
    await expect(page.locator('p', { hasText: /8.{0,2}000.+20.{0,2}000/ })).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/28-stage-budget.png' })

    // Sprzątanie
    await page.locator('button', { hasText: 'Ustawienia' }).click()
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── EditCostSheet: VendorInput autocomplete ───────────────

  test('29 — EditCostSheet: VendorInput podpowiada istniejących wykonawców', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt EditSheet Vendor')
    await addCost(page, projectId, 'Cement', '1500', 'CemexPolska')
    await addCost(page, projectId, 'Piasek', '600')
    await page.goto(`${BASE}/projects/${projectId}`)

    // Edytuj koszt bez vendora (Piasek) — wpisz fragment
    const piasekRow = page.locator('div.divide-y > div').filter({ hasText: 'Piasek' })
    await piasekRow.locator('button:has(.lucide-ellipsis)').click()
    await page.getByRole('menuitem', { name: /Edytuj/ }).click()

    await expect(page.getByRole('heading', { name: 'Edytuj koszt' })).toBeVisible()
    await page.locator('#ec-vendor').fill('Cem')
    await expect(page.getByRole('button', { name: 'CemexPolska', exact: true })).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: 'tests/screenshots/29-edit-vendor-autocomplete.png' })

    // Sprzątanie
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button:has(.lucide-trash2)').first().click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

  // ── Chip "+ Etap" przypisuje etap do kosztu ───────────────

  test('30 — chip "+ Etap" w formularzu: etap przypisany, widoczny na liście', async ({ page }) => {
    await login(page)
    const projectId = await createProject(page, 'Projekt Chip Etap')

    // Utwórz etap
    await page.goto(`${BASE}/projects/${projectId}`)
    await page.locator('button', { hasText: 'Etapy' }).click()
    await page.getByPlaceholder('np. Stan surowy, Wykończenie…').fill('Dach')
    await page.getByRole('button', { name: 'Dodaj etap' }).click()
    await expect(page.getByText('Dach')).toBeVisible()

    // Dodaj koszt z przypisanym etapem
    await page.goto(`${BASE}/projects/${projectId}/costs/new`)
    await page.fill('#amount', '15000')
    await page.fill('#name', 'Dachówki ceramiczne')
    await page.locator('button', { hasText: 'Etap' }).click()
    await expect(page.getByRole('button', { name: 'Dach' })).toBeVisible()
    await page.getByRole('button', { name: 'Dach' }).click()
    await expect(page.locator('span.rounded-full', { hasText: 'Dach' })).toBeVisible({ timeout: 3_000 })

    await page.locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 })

    await expect(page.getByText('Dachówki ceramiczne')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/30-stage-chip.png' })

    // Filtr po etapie powinien pokazać ten koszt
    await page.locator('button', { hasText: 'Etapy' }).click()
    // Spending widoczne w etapie
    await expect(page.locator('p', { hasText: /Wydano:.*15.000/ })).toBeVisible()

    // Sprzątanie
    await page.locator('button', { hasText: 'Ustawienia' }).click()
    await page.locator('button:has(.lucide-trash2)').click()
    await page.getByRole('button', { name: /^Usuń$/ }).click()
    await page.waitForURL(/\/dashboard/)
  })

})
