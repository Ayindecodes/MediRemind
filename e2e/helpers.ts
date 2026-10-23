// e2e/helpers.ts
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { EMAIL_PORT } from './ports';

export const EMAIL_SERVER = `http://localhost:${EMAIL_PORT}`;
export const PASSWORD = 'Passw0rdOk';

// A fresh address per test, since the app's data lasts for the whole run
export const uniqueEmail = (name: string) =>
  `${name}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;

// The code from the latest email sent to this address (waits for it to arrive)
export async function latestCode(request: APIRequestContext, to: string, after = 0) {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const emails = await (await request.get(`${EMAIL_SERVER}/emails`, { params: { to } })).json();
      code = emails
        .slice(after)
        .at(-1)
        ?.html.match(/class="code">(\d{6})</)?.[1];
      return code;
    })
    .toBeTruthy();
  return code!;
}

export async function emailCount(request: APIRequestContext, to: string) {
  return (await (await request.get(`${EMAIL_SERVER}/emails`, { params: { to } })).json()).length;
}

// Makes the fake email service reject every email (like a bad key or a blocked recipient)
export async function setEmailFailure(request: APIRequestContext, fail: boolean) {
  await request.post(`${EMAIL_SERVER}/failure`, { data: { fail } });
}

export async function typeCode(page: Page, code: string) {
  for (let i = 0; i < 6; i++) await page.locator(`#code-${i}`).fill(code[i]);
}

/**
 * Creates a verified account and signs the browser in through the API, which is quicker than the
 * forms (those are covered in auth.spec.ts). Returns the email address used.
 */
export async function signIn(page: Page, name = 'tester') {
  const email = uniqueEmail(name);
  const { request } = page;

  await request.post('/api/signup', {
    data: { fullName: 'E2E Tester', email, password: PASSWORD },
  });
  await request.post('/api/verify', { data: { email, code: await latestCode(request, email) } });

  const sent = await emailCount(request, email);
  await request.post('/api/login', { data: { email, password: PASSWORD } });
  const code = await latestCode(request, email, sent);
  const { token, user } = await (
    await request.post('/api/login/verify', { data: { email, code } })
  ).json();

  // Store the session the way the login page does
  await page.goto('/login');
  await page.evaluate(
    ([token, user]) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    [token, user],
  );
  return email;
}
