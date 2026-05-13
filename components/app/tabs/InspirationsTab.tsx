'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Lightbulb, Plus, Trash2, ExternalLink, ChevronDown, X, Loader2 } from 'lucide-react'
import type { Inspiration, InspirationRoom } from '@/types'
import { INSPIRATION_ROOMS } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

// Inspirations are fetched client-side when the tab is first activated
// to avoid blocking the critical project page load (costs, stages).

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function InspirationCard({
  item,
  onDelete,
  onUpdate,
}: {
  item: Inspiration
  onDelete: (id: string) => void
  onUpdate: (updated: Inspiration) => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState(item.notes ?? '')
  const [room, setRoom] = useState<InspirationRoom>(item.room)
  const [saving, setSaving] = useState(false)

  async function remove() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${item.project_id}/inspirations/${item.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Błąd usuwania'); return }
      onDelete(item.id)
      toast.success('Usunięto')
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${item.project_id}/inspirations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || null, room }),
      })
      if (!res.ok) { toast.error('Błąd zapisu'); return }
      onUpdate(await res.json())
      setEditOpen(false)
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="group relative rounded-xl border border-border bg-card overflow-hidden">
        {/* Thumbnail */}
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail_url}
            alt={item.title ?? ''}
            className="w-full aspect-video object-cover bg-muted"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center">
            <p className="text-xs text-muted-foreground">{getDomain(item.url)}</p>
          </div>
        )}

        {/* Body */}
        <div className="p-3 space-y-1.5">
          {item.title && (
            <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{getDomain(item.url)}</p>
          {item.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 flex items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={() => setEditOpen(true)}
            className="h-7 w-7 flex items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="h-7 w-7 flex items-center justify-center rounded-md bg-black/50 text-white hover:bg-red-500/80 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj inspirację</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm text-muted-foreground w-16 shrink-0">Pokój</span>
                <div className="relative flex-1">
                  <select
                    value={room}
                    onChange={e => setRoom(e.target.value as InspirationRoom)}
                    className="w-full appearance-none bg-transparent text-sm pr-6 focus:outline-none"
                  >
                    {INSPIRATION_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <div className="px-4 py-3">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notatka (opcjonalnie)"
                  rows={3}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Zapisuję…' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Usuń inspirację</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Czy na pewno chcesz usunąć tę inspirację?</p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AddInspirationForm({ projectId, onAdded }: { projectId: string; onAdded: (i: Inspiration) => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [room, setRoom] = useState<InspirationRoom>('Salon')
  const [notes, setNotes] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)

  async function handleUrlBlur() {
    if (!url.trim() || fetching) return
    setFetching(true)
    // Fire-and-forget metadata fetch — we'll use the data when saving
  }

  async function save() {
    if (!url.trim()) { toast.error('Wklej URL'); return }
    setSaving(true)
    try {
      let title: string | null = null
      let thumbnail_url: string | null = null
      try {
        setFetching(true)
        const meta = await fetch('/api/fetch-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
        if (meta.ok) {
          const d = await meta.json()
          title = d.title
          thumbnail_url = d.thumbnail_url
        }
      } catch { /* metadata optional */ } finally {
        setFetching(false)
      }

      const res = await fetch(`/api/projects/${projectId}/inspirations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), room, title, thumbnail_url, notes: notes || null }),
      })
      if (!res.ok) { toast.error('Błąd zapisu'); return }
      onAdded(await res.json())
      setUrl('')
      setNotes('')
      setOpen(false)
      toast.success('Inspiracja dodana')
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => urlRef.current?.focus(), 50) }}
        className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Dodaj inspirację
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {/* URL */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm text-muted-foreground w-12 shrink-0">Link</span>
        <input
          ref={urlRef}
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://tiktok.com/…"
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
        />
        {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
      </div>

      {/* Pokój */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm text-muted-foreground w-12 shrink-0">Pokój</span>
        <div className="relative flex-1">
          <select
            value={room}
            onChange={e => setRoom(e.target.value as InspirationRoom)}
            className="w-full appearance-none bg-transparent text-sm pr-6 focus:outline-none"
          >
            {INSPIRATION_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
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

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <Button size="sm" onClick={save} disabled={saving || !url.trim()}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Zapisuję…</> : 'Dodaj'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setUrl(''); setNotes('') }}>
          <X className="h-3.5 w-3.5 mr-1" />
          Anuluj
        </Button>
      </div>
    </div>
  )
}

export default function InspirationsTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Inspiration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRoom, setActiveRoom] = useState<InspirationRoom | 'Wszystkie'>('Wszystkie')

  useEffect(() => {
    fetch(`/api/projects/${projectId}/inspirations`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Nie udało się załadować inspiracji'))
      .finally(() => setLoading(false))
  }, [projectId])

  const filtered = activeRoom === 'Wszystkie'
    ? items
    : items.filter(i => i.room === activeRoom)

  const roomsWithCount = INSPIRATION_ROOMS.filter(r => items.some(i => i.room === r))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Room filter */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['Wszystkie', ...roomsWithCount] as const).map(r => (
            <button
              key={r}
              onClick={() => setActiveRoom(r as InspirationRoom | 'Wszystkie')}
              className={[
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeRoom === r
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 && items.length > 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Brak inspiracji w kategorii „{activeRoom}"
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Brak inspiracji</p>
            <p className="text-sm text-muted-foreground mt-1">
              Wklej link z TikToka, YouTube lub innych stron
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(item => (
            <InspirationCard
              key={item.id}
              item={item}
              onDelete={id => setItems(prev => prev.filter(i => i.id !== id))}
              onUpdate={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
            />
          ))}
        </div>
      )}

      <AddInspirationForm
        projectId={projectId}
        onAdded={ins => setItems(prev => [ins, ...prev])}
      />
    </div>
  )
}
