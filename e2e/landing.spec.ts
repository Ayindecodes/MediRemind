import { expect, test } from '@playwright/test';

// Claims removed in Task 10 that must not come back without being true
const FALSE_CLAIMS =
  /HIPAA|end-to-end|Stripe|PayPal|4\.9\/5|reviews|Trusted by|thousands|Guarantee|Money Back|24\/7|uptime|Dr\. |licensed|certified|#1 |Free Trial|\$29|Create Next App/i;

test('has a real title and no false marketing claims', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('MediRemind - Medication tracking and reminders');
  const lines = (await page.locator('body').innerText()).split('\n');
  expect(lines.filter((line) => FALSE_CLAIMS.test(line))).toEqual([]);
});

test('shows the hero once its entrance animation finishes', async ({ page }) => {
  await page.goto('/');

  for (const column of await page.locator('#hero .flex-1').all()) {
    await expect(column).toHaveCSS('opacity', '1');
  }
});

test('loads the blog images', async ({ page }) => {
  await page.goto('/');
  await page.locator('#blog').scrollIntoViewIfNeeded();

  const images = page.locator('#blog img');
  await expect(images).toHaveCount(3);
  for (const image of await images.all()) {
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
});

test('shows paid plans as coming soon', async ({ page }) => {
  await page.goto('/#pricing');

  const pricing = page.locator('#pricing');
  await expect(pricing.getByText('Coming Soon', { exact: true })).toHaveCount(2);
  await expect(pricing.getByRole('link', { name: 'Get Started Free' }).first()).toHaveAttribute(
    'href',
    '/signup',
  );
});

test('remembers the dark mode choice across visits', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Toggle Dark Mode' }).first().click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
});
