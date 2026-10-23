import { expect, test, type Page } from '@playwright/test';
import {
  PASSWORD,
  emailCount,
  latestCode,
  setEmailFailure,
  typeCode,
  uniqueEmail,
} from './helpers';

test.afterEach(async ({ request }) => {
  await setEmailFailure(request, false);
});

async function fillSignupForm(page: Page, email: string) {
  await page.goto('/signup');
  await page.fill('#fullName', 'Ada Obi');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await page.locator('#confirmPassword').blur();
  await page.getByRole('button', { name: 'Create Account' }).click();
}

test('sends signed-out visitors to the login page', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('signs up, verifies the email and logs in with emailed codes', async ({ page, request }) => {
  const email = uniqueEmail('ada');

  await fillSignupForm(page, email);
  await expect(page.getByRole('heading', { name: 'Verify Your Email' })).toBeVisible();
  await typeCode(page, await latestCode(request, email));
  await page.getByRole('button', { name: 'Verify Account' }).click();

  // Not signed in yet after verifying, so the dashboard sends the user to log in (Task 40 changes this)
  await expect(page).toHaveURL(/\/login$/);

  const sent = await emailCount(request, email);
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('heading', { name: 'Verify Your Login' })).toBeVisible();
  await typeCode(page, await latestCode(request, email, sent));
  await page.getByRole('button', { name: 'Verify & Login' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: "Today's Medications" })).toBeVisible();
});

test('rejects a wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', uniqueEmail('nobody'));
  await page.fill('#password', 'WrongPassw0rd');
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test('rejects a wrong login code', async ({ page, request }) => {
  const email = uniqueEmail('ada');
  await request.post('/api/signup', { data: { fullName: 'Ada', email, password: PASSWORD } });
  await request.post('/api/verify', { data: { email, code: await latestCode(request, email) } });

  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await typeCode(page, '000000');
  await page.getByRole('button', { name: 'Verify & Login' }).click();

  await expect(page.getByText('Invalid code')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('tells the user when the verification email fails, and recovers with Resend Code', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('ada');
  await setEmailFailure(request, true);

  await fillSignupForm(page, email);
  await expect(page.getByText("we couldn't send the verification email")).toBeVisible();
  await expect(page.getByText(`We couldn't email a code to ${email} yet`)).toBeVisible();

  await setEmailFailure(request, false);
  await page.getByRole('button', { name: 'Resend Code' }).click();
  await expect(page.getByText('New verification code sent!')).toBeVisible();

  await typeCode(page, await latestCode(request, email));
  await page.getByRole('button', { name: 'Verify Account' }).click();
  await expect(page.getByText('Account verified!')).toBeVisible();
});
