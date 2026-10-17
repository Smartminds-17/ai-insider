import { createBrowserClient } from '@supabase/ssr';

// Initialize Supabase browser client for client-side operations (file uploads, storage access)
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};