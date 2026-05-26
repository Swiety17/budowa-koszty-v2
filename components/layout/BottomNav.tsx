'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { House, Plus, User, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useMemo, useState } from 'react'

export default function BottomNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const supabase = useMemo(() => createClient(), [])
  const [accountOpen, setAccountOpen] = useState(false)

  async function signOut() {
    setAccountOpen(false)
    await supabase.auth.signOut()
    toast.success('Wylogowano')
    router.push('/login')
  }

  const projectId = pathname.match(/\/projects\/([a-f0-9-]{36})/)?.[1]
  const fabHref = projectId ? `/projects/${projectId}/costs/new` : '/projects/new'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      {/* Account sheet — slides up from nav */}
      {accountOpen && (
        <div className="absolute bottom-full left-0 right-0 px-4 pb-2 animate-sheet-up">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              boxShadow: '0 -2px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3"
              style={{
                background: 'var(--color-surface2)',
                borderBottom: '0.5px solid var(--color-border)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Zalogowany jako</p>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
                {userEmail}
              </p>
            </div>

            {/* Dark mode toggle */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '0.5px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark'
                  ? <Moon className="h-4 w-4" style={{ color: 'var(--color-muted)' }} />
                  : <Sun  className="h-4 w-4" style={{ color: 'var(--color-muted)' }} />
                }
                <span className="text-base" style={{ color: 'var(--color-foreground)' }} suppressHydrationWarning>
                  {theme === 'dark' ? 'Tryb ciemny' : 'Tryb jasny'}
                </span>
              </div>
              {/* iOS toggle */}
              <button
                type="button"
                onClick={toggle}
                aria-label="Przełącz tryb ciemny"
                className="relative flex-shrink-0 rounded-full transition-colors duration-250"
                style={{
                  width: 51, height: 31,
                  background: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-surface3)',
                }}
                suppressHydrationWarning
              >
                <span
                  className="absolute top-0.5 rounded-full shadow"
                  style={{
                    width: 27, height: 27,
                    background: '#ffffff',
                    left: theme === 'dark' ? 22 : 2,
                    transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  suppressHydrationWarning
                />
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={signOut}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-left"
              style={{ color: 'var(--color-danger)' }}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-base">Wyloguj się</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex items-start"
        style={{
          height: 83,
          background: 'var(--color-tab-bg)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          borderTop: '0.5px solid var(--color-border)',
          paddingTop: 6,
          paddingBottom: 22,
        }}
      >
        {/* Budowy */}
        <Link
          href="/dashboard"
          className="flex-1 flex flex-col items-center gap-0.5"
          style={{ color: pathname === '/dashboard' ? 'var(--color-accent)' : 'var(--color-subtle)' }}
        >
          <House
            className="h-6 w-6"
            fill={pathname === '/dashboard' ? 'currentColor' : 'none'}
            strokeWidth={pathname === '/dashboard' ? 0 : 1.75}
          />
          <span className="text-[10.5px]" style={{ fontWeight: pathname === '/dashboard' ? 600 : 400 }}>
            Budowy
          </span>
        </Link>

        {/* FAB */}
        <div className="flex-1 flex justify-center" style={{ paddingTop: 2 }}>
          <Link
            href={fabHref}
            className="flex items-center justify-center rounded-full motion-safe:active:scale-95 transition-transform"
            aria-label="Dodaj"
            style={{
              width: 48, height: 48,
              background: 'var(--color-accent)',
              boxShadow: '0 4px 14px rgba(44,165,147,0.40)',
            }}
          >
            <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Konto */}
        <button
          type="button"
          onClick={() => setAccountOpen(o => !o)}
          className="flex-1 flex flex-col items-center gap-0.5"
          style={{ color: accountOpen ? 'var(--color-accent)' : 'var(--color-subtle)' }}
        >
          <User
            className="h-6 w-6"
            fill={accountOpen ? 'currentColor' : 'none'}
            strokeWidth={accountOpen ? 0 : 1.75}
          />
          <span className="text-[10.5px]" style={{ fontWeight: accountOpen ? 600 : 400 }}>
            Konto
          </span>
        </button>
      </div>
    </nav>
  )
}
