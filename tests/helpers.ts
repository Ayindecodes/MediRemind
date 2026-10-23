// tests/helpers.ts
// Shared setup for tests that call the API route handlers directly.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';

export const JWT_SECRET = 'test-jwt-secret'.padEnd(40, '-');
export const CRON_SECRET = 'test-cron-secret'.padEnd(40, '-');
export const PASSWORD = 'Passw0rdOk';

/**
 * Loads modules fresh with data/ pointed at an empty temporary folder (the storage layer finds
 * data/ from process.cwd() when it loads). Returns the loaded modules and the folder to delete.
 */
export async function loadWithTempData<T>(load: () => Promise<T>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mediremind-test-'));
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.resetModules();
  try {
    return { root, modules: await load() };
  } finally {
    cwd.mockRestore();
  }
}

// A request like the browser sends: JSON body and an optional login token
export function request(
  url: string,
  { method = 'POST', body, token }: { method?: string; body?: unknown; token?: string } = {},
) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// The 6-digit code in the last email sent to this address, read the way a user would
export function lastCodeSentTo(sendEmail: ReturnType<typeof vi.fn>, to: string): string {
  const call = sendEmail.mock.calls.filter(([message]) => message.to === to).pop();
  if (!call) throw new Error(`No email was sent to ${to}`);
  const code = String(call[0].html).match(/class="code">(\d{6})</)?.[1];
  if (!code) throw new Error(`The last email to ${to} has no code`);
  return code;
}
