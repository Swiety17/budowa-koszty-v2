'use client'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <Sidebar userEmail={userEmail} />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
        {/* Spacer for BottomNav + iOS home bar — mobile only */}
        <div
          className="md:hidden"
          style={{ height: 'calc(5rem + var(--safe-bottom, 0px))' }}
          aria-hidden="true"
        />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav userEmail={userEmail} />
    </div>
  )
}
