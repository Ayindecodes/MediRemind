import { beforeEach, describe, expect, it, vi } from 'vitest';

// A fake Resend client: tests decide what emails.send() returns
const { send, constructedWith } = vi.hoisted(() => ({
  send: vi.fn(),
  constructedWith: [] as string[],
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
    constructor(apiKey: string) {
      constructedWith.push(apiKey);
    }
  },
}));

// lib/email.ts keeps its client in a module variable, so load a fresh copy for every test
async function loadEmail() {
  vi.resetModules();
  return import('./email');
}

beforeEach(() => {
  send.mockReset();
  constructedWith.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('escapeHtml', () => {
  it('escapes the characters that could inject HTML', async () => {
    const { escapeHtml } = await loadEmail();
    expect(escapeHtml(`<img src=x onerror="alert(1)"> & 'quotes'`)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quotes&#39;',
    );
  });

  it('escapes & first, so existing entities are not left half-escaped', async () => {
    const { escapeHtml } = await loadEmail();
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('turns missing values into an empty string and other values into text', async () => {
    const { escapeHtml } = await loadEmail();
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(5)).toBe('5');
  });
});

describe('sendEmail', () => {
  const message = { to: 'ada@example.com', subject: 'Hello', html: '<p>Hi</p>' };

  it('returns true when Resend accepts the email', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockResolvedValue({ data: { id: 'email_1' }, error: null });
    const { sendEmail } = await loadEmail();

    await expect(sendEmail(message)).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith({ from: 'MediRemind <onboarding@resend.dev>', ...message });
  });

  it('returns false when Resend reports an error instead of throwing', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid' },
    });
    const { sendEmail } = await loadEmail();

    await expect(sendEmail(message)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'Email sending failed (validation_error): API key is invalid',
    );
  });

  it('returns false instead of throwing when the request fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockRejectedValue(new Error('network down'));
    const { sendEmail } = await loadEmail();

    await expect(sendEmail(message)).resolves.toBe(false);
  });

  it('returns false without contacting Resend when RESEND_API_KEY is not set', async () => {
    vi.stubEnv('RESEND_API_KEY', undefined);
    const { sendEmail } = await loadEmail();

    await expect(sendEmail(message)).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('creates the Resend client once, on first use', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockResolvedValue({ data: { id: 'email_1' }, error: null });
    const { sendEmail } = await loadEmail();
    expect(constructedWith).toEqual([]);

    await sendEmail(message);
    await sendEmail(message);
    expect(constructedWith).toEqual(['re_test']);
  });
});
