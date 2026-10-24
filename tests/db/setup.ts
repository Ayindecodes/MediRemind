// Points the app's Supabase settings at the local stack found by global-setup.ts
import { inject } from 'vitest';

const supabase = inject('supabase');
process.env.NEXT_PUBLIC_SUPABASE_URL = supabase.url;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = supabase.publishableKey;
process.env.SUPABASE_SECRET_KEY = supabase.secretKey;
