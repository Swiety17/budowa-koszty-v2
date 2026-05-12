'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Lightbulb, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { InspirationRoom, Project } from '@/types'
import { INSPIRATION_ROOMS } from '@/types'
import { Button } from '@/components/ui/button'

function SharePageInner() {
  const params = useSearchParams()
  const router = useRouter()

  const sharedUrl = params.get('url') ?? params.get('text') ?? ''
  const sharedTitle = params.get('title') ?? ''

  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [room, setRoom] = useState<InspirationRoom>('Salon')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        const list: Project[] = Array.isArray(data) ? data : []
        setProjects(list)
        if (list.length === 1) setProjectId(list[0].id)
      })
      .catch(() => toast.error('Nie udało się załadować projektów'))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!projectId) { toast.error('Wybierz projekt'); return }
    if (!sharedUrl) { toast.error('Brak URL'); return }
    setSaving(true)
    try {
      // fetch metadata server-side
      let title = sharedTitle || null
      let thumbnail_url: string | null = null
      try {
        const meta = await fetch('/api/fetch-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sharedUrl }),
        })
        if (meta.ok) {
          const d = await meta.json()
          title = title || d.title
          thumbnail_url = d.thumbnail_url
        }
      } catch { /* metadata optional */ }

      const res = await fetch(`/api/projects/${projectId}/inspirations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sharedUrl, room, title, thumbnail_url, notes: notes || null }),
      })
      if (!res.ok) { toast.error('Błąd zapisu'); return }
      toast.success('Inspiracja zapisana!')
      router.push(`/projects/${projectId}?tab=inspirations`)
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40dvh]">
        <p className="text-muted-foreground text-sm">Ładowanie…</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[#3dbdaa]/10 p-2.5">
          <Lightbulb className="h-5 w-5 text-[#3dbdaa]" />
        </div>
        <div>
          <p className="font-semibold">Zapisz inspirację</p>
          <p className="text-xs text-muted-foreground truncate max-w-[240px]">{sharedUrl || 'Brak URL'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {/* Projekt */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground w-20 shrink-0">Projekt</span>
          <div className="relative flex-1">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full appearance-none bg-transparent text-sm pr-6 focus:outline-none"
            >
              <option value="">Wybierz projekt…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Pokój */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-muted-foreground w-20 shrink-0">Pokój</span>
          <div className="relative flex-1">
            <select
              value={room}
              onChange={e => setRoom(e.target.value as InspirationRoom)}
              className="w-full appearance-none bg-transparent text-sm pr-6 focus:outline-none"
            >
              {INSPIRATION_ROOMS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Notatka */}
        <div className="px-4 py-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notatka (opcjonalnie)"
            rows={2}
            className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <Button className="w-full" onClick={save} disabled={saving || !projectId}>
        {saving ? 'Zapisuję…' : 'Zapisz inspirację'}
      </Button>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40dvh]">
        <p className="text-muted-foreground text-sm">Ładowanie…</p>
      </div>
    }>
      <SharePageInner />
    </Suspense>
  )
}
