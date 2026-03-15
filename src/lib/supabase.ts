
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. File storage will not work correctly.');
}

// Public client for client-side uploads (requires RLS policies)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Admin client for server-side management (listing, bulk delete)
// We only initialize this on the server where the Service Role Key is available.
// This prevents "supabaseKey is required" errors in the browser.
export const supabaseAdmin = (typeof window === 'undefined' && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any;
