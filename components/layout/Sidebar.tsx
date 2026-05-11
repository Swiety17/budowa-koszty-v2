'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useMemo } from 'react'

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const supabase = useMemo(() => createClient(), [])

  async function signOut() {
    await supabase.auth.signOut()
    toast.success('Wylogowano')
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <span className="text-lg font-bold text-accent">Budowa Koszty</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard'
              ? 'bg-accent/10 text-accent'
              : 'text-foreground hover:bg-surface'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Budowy
        </Link>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface w-full transition-colors"
        >
          <span suppressHydrationWarning>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          <span suppressHydrationWarning>
            {theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
          </span>
        </button>

        <div className="px-3 py-2">
          <p className="text-xs text-muted truncate">{userEmail}</p>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </button>
      </div>
    </aside>
  )
}
