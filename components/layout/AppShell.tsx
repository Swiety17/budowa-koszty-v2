'use client'
import { useRef } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import PullToRefresh from '@/components/app/PullToRefresh'

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail: string
}) {
  const mainRef = useRef<HTMLElement>(null)

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar userEmail={userEmail} />

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto overscroll-none p-4 md:p-6">
        {/* Spacer for Dynamic Island / notch in PWA standalone mode */}
        <div className="pwa-safe-top" aria-hidden="true" />
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

      <PullToRefresh scrollRef={mainRef} />

      {/* Mobile bottom nav */}
      <BottomNav userEmail={userEmail} />
    </div>
  )
}
