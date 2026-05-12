'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 72 // px

export default function PullToRefresh({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const startYRef    = useRef(0)
  const isPullingRef = useRef(false)
  const pullYRef     = useRef(0)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      // Only initiate pull when scroll container is at the very top
      if (el!.scrollTop > 2) return
      startYRef.current = e.touches[0].clientY
      isPullingRef.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPullingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current

      if (dy <= 0) {
        isPullingRef.current = false
        pullYRef.current = 0
        setPullY(0)
        return
      }

      // Prevent browser's native pull-to-refresh
      e.preventDefault()

      // Resistance: linear up to THRESHOLD, then slows
      const val = Math.min(
        dy < THRESHOLD ? dy : THRESHOLD + (dy - THRESHOLD) * 0.25,
        THRESHOLD * 1.5,
      )
      pullYRef.current = val
      setPullY(val)
    }

    function onTouchEnd() {
      if (!isPullingRef.current) return
      isPullingRef.current = false
      const reached = pullYRef.current >= THRESHOLD
      pullYRef.current = 0
      setPullY(0)

      if (reached && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        router.refresh()
        setTimeout(() => {
          refreshingRef.current = false
          setRefreshing(false)
        }, 1200)
      }
    }

    // window-level listeners: iOS PWA requires non-passive touchmove at window
    // scope to reliably preventDefault before WebKit starts the native scroll
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: false })
    window.addEventListener('touchend',   onTouchEnd,   { passive: true })
    window.addEventListener('touchcancel', onTouchEnd,  { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [router, scrollRef])

  const progress = Math.min(pullY / THRESHOLD, 1)
  const visible = pullY > 6 || refreshing

  if (!visible) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-background border border-border shadow-md"
        style={{
          transform: refreshing ? undefined : `rotate(${Math.round(progress * 270)}deg)`,
        }}
      >
        <RefreshCw
          className={`h-4 w-4 text-foreground/70 ${refreshing ? 'animate-spin' : ''}`}
        />
      </div>
    </div>
  )
}
