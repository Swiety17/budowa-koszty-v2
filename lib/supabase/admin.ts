import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'

// Server-only: bypasses RLS — always filter by user explicitly
// cache() zapewnia jedną instancję per request (server components + API routes)
export const createAdminClient = cache(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
)
