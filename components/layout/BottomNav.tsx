'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Plus, Sun, Moon, LogOut, CircleUser } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

export default function BottomNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const supabase = useMemo(() => createClient(), [])
  const [profileOpen, setProfileOpen] = useState(false)

  async function signOut() {
    setProfileOpen(false)
    await supabase.auth.signOut()
    toast.success('Wylogowano')
    router.push('/login')
  }

  // FAB target: on project page → new cost; otherwise → new project
  const projectId = pathname.match(/\/projects\/([a-f0-9-]{36})/)?.[1]
  const fabHref = projectId ? `/projects/${projectId}/costs/new` : '/projects/new'
  const fabLabel = projectId ? 'Dodaj koszt' : 'Nowa budowa'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-surface border-t border-border"
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {/* Budowy */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors ${
            pathname === '/dashboard' ? 'text-accent' : 'text-muted'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          Budowy
        </Link>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggle}
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-muted"
        >
          <span suppressHydrationWarning>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </span>
          <span suppressHydrationWarning>
            {theme === 'dark' ? 'Jasny' : 'Ciemny'}
          </span>
        </button>

        {/* FAB */}
        <Link href={fabHref} className="flex flex-col items-center gap-1 px-4 py-2 text-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg -mt-6">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-muted">{fabLabel}</span>
        </Link>

        {/* Konto */}
        <Popover.Root open={profileOpen} onOpenChange={setProfileOpen}>
          <Popover.Trigger asChild>
            <button className={`flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors ${profileOpen ? 'text-accent' : 'text-muted'}`}>
              <CircleUser className="h-5 w-5" />
              Konto
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="top"
              align="end"
              sideOffset={8}
              className="bg-card border border-border rounded-xl shadow-lg p-2 min-w-44 z-50"
            >
              <p className="text-xs text-muted px-3 pt-1 pb-2 truncate">{userEmail}</p>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg w-full transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </nav>
  )
}
