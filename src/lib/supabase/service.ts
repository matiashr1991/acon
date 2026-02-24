import { createClient } from '@supabase/supabase-js'

// This client bypasses RLS. Only use it on the server (App Router API routes / Server actions)
// Never expose this to the browser directly.
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
