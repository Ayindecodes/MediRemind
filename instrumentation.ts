// instrumentation.ts
// Next.js calls register() once when a server instance starts: stop early on invalid configuration
// instead of failing later on the first request that needs it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { checkServerEnv } = await import('./lib/env');
  for (const warning of checkServerEnv()) console.warn(`⚠️  ${warning}`);
}
