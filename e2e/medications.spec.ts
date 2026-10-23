import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

// A 1×1 PNG for the photo preview
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.beforeEach(async ({ page }) => {
  await signIn(page);
  page.on('dialog', (dialog) => dialog.accept());
});

async function addMedication(page: Page, name: string) {
  await page.goto('/dashboard/medications/add');
  await page.getByPlaceholder('e.g., Aspirin, Vitamin D, Lisinopril').fill(name);
  await page.getByPlaceholder('e.g., 500mg, 2 tablets, 5ml').fill('5mg');
  await page.getByRole('button', { name: 'Save Medication' }).click();
  await expect(page.getByText('Medication added successfully!')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('adds a medication from the dashboard and shows it there', async ({ page }) => {
  await page.goto('/dashboard');
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await page.getByRole('button', { name: 'Add Med' }).click();
  await expect(page).toHaveURL(/\/dashboard\/medications\/add$/);
  // Still the same page load: navigation no longer reloads the app (Task 22)
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);

  await page.getByPlaceholder('e.g., Aspirin, Vitamin D, Lisinopril').fill('Amlodipine');
  await page.getByPlaceholder('e.g., 500mg, 2 tablets, 5ml').fill('5mg');
  await page.getByRole('button', { name: 'Save Medication' }).click();

  await expect(page.getByText('A confirmation email has been sent.')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Amlodipine' })).toBeVisible();
});

test('previews a pill photo', async ({ page }) => {
  await page.goto('/dashboard/medications/add');
  await page.locator('input[type=file]').setInputFiles({
    name: 'pill.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });

  const preview = page.getByRole('img', { name: 'Preview' });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveJSProperty('complete', true);
});

test('searches and filters medications', async ({ page }) => {
  await addMedication(page, 'Amlodipine');
  await page.goto('/dashboard/medications');
  const search = page.getByPlaceholder('Search medications...');

  await search.fill('zzz');
  await expect(page.getByText('No medications found')).toBeVisible();
  await search.fill('amlo');
  await expect(page.getByRole('heading', { name: 'Amlodipine' })).toBeVisible();

  await search.fill('');
  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(page.getByText('No medications yet')).toBeVisible();
  await page.getByRole('button', { name: 'Active' }).click();
  await expect(page.getByRole('heading', { name: 'Amlodipine' })).toBeVisible();
});

test('marks a dose as taken and opens the history', async ({ page }) => {
  await addMedication(page, 'Amlodipine');
  await page.goto('/dashboard/medications');

  await page.getByRole('button', { name: 'Mark as Taken' }).first().click();
  await expect(page.getByText('✓ Taken')).toBeVisible();

  await page.getByRole('button', { name: /Show History/ }).click();
  await expect(page.getByRole('heading', { name: 'Medication History' })).toBeVisible();
});

test('keeps a dose marked as taken after reloading', async ({ page }) => {
  test.fail(true, 'Known bug: the dose ID is parsed incorrectly when saving (Task 45)');

  await addMedication(page, 'Amlodipine');
  await page.goto('/dashboard/medications');
  await page.getByRole('button', { name: 'Mark as Taken' }).first().click();
  await expect(page.getByText('✓ Taken')).toBeVisible();

  await page.reload();
  await expect(page.getByText('✓ Taken')).toBeVisible({ timeout: 5_000 });
});

test('deletes a medication for good and notifies the user', async ({ page }) => {
  await addMedication(page, 'Amlodipine');
  await page.goto('/dashboard/medications');

  // The "more" menu icon (lucide renamed MoreVertical to EllipsisVertical)
  await page
    .locator('button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical)')
    .first()
    .click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Amlodipine' })).toBeHidden();

  await page.reload();
  await expect(page.getByText('Manage all your medications')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Amlodipine' })).toBeHidden();

  await page.locator('button:has(svg.lucide-bell)').click();
  await expect(page.getByText('Medication "Amlodipine" has been deleted')).toBeVisible();
});

test('shows paid plans as coming soon on the upgrade page', async ({ page }) => {
  await page.goto('/dashboard/upgrade');

  await expect(page.getByText('Paid plans are coming soon')).toBeVisible();
  for (const button of await page.getByRole('button', { name: 'Coming Soon' }).all()) {
    await expect(button).toBeDisabled();
  }
});

test('logs out', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
