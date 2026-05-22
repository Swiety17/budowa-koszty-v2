'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const remember =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('budowa-remember-me') === '1'
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: typeof window !== 'undefined'
          ? (remember ? window.localStorage : window.sessionStorage)
          : undefined,
        persistSession: true,
      },
    }
  )
}
