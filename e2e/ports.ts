// e2e/ports.ts
// Ports for the browser tests; override them if something else on your machine uses these.
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 4310);
export const EMAIL_PORT = Number(process.env.E2E_EMAIL_PORT ?? 4311);
