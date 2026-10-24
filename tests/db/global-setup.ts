// Finds the local Supabase stack once, before any data-layer test runs, and hands its address and
// keys to the tests (see setup.ts).
import { execFileSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

export interface LocalSupabase {
  url: string;
  publishableKey: string;
  secretKey: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    supabase: LocalSupabase;
  }
}

export default function setup(project: TestProject) {
  let status: Record<string, string>;
  try {
    const output = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    status = JSON.parse(output);
  } catch {
    throw new Error('The local Supabase stack is not running. Start it with: npm run db:start');
  }
  if (!status.API_URL || !status.PUBLISHABLE_KEY || !status.SECRET_KEY) {
    throw new Error(
      'The local Supabase stack is not fully running (the data layer needs its API). Run: npm run db:start',
    );
  }
  project.provide('supabase', {
    url: status.API_URL,
    publishableKey: status.PUBLISHABLE_KEY,
    secretKey: status.SECRET_KEY,
  });
}
