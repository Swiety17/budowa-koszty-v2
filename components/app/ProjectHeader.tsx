'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Project } from '@/types'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

function parseBudget(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return isNaN(n) || n < 0 ? null : n
}

export default function ProjectHeader({
  project: initial,
  total,
  isOwner,
}: {
  project: Project
  total: number
  isOwner: boolean
}) {
  const router = useRouter()
  const [project, setProject] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    name: initial.name,
    address: initial.address ?? '',
    budget: initial.budget ? String(initial.budget) : '',
    description: initial.description ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function saveEdit() {
    if (!form.name.trim()) { toast.error('Nazwa jest wymagana'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
          budget: parseBudget(form.budget),
          description: form.description.trim() || null,
        }),
      })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd serwera'); return }
      const data = await res.json()
      setProject(data)
      setEditOpen(false)
      toast.success('Zapisano zmiany')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd serwera'); return }
      toast.success('Budowa usunięta')
      router.push('/dashboard')
    } finally {
      setDeleting(false)
    }
  }

  const pct = project.budget ? Math.min((total / project.budget) * 100, 100) : null
  const barColor =
    pct === null       ? null
    : pct < 75         ? 'var(--color-success)'
    : pct < 95         ? 'var(--color-warning)'
    :                    'var(--color-danger)'

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground -ml-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Moje budowy
      </Link>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {/* Name + actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold leading-snug">{project.name}</h1>
              {!isOwner && <Badge variant="secondary">Udostępniona</Badge>}
            </div>
            {project.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.address}</span>
              </p>
            )}
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
            )}
          </div>

          {isOwner && (
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edytuj</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Usuń</span>
              </Button>
            </div>
          )}
        </div>

        {/* Total */}
        <p className="text-3xl font-bold" style={{ color: 'var(--color-amount)' }}>
          {formatCurrency(total)}
        </p>

        {/* Budget bar */}
        {project.budget && pct !== null ? (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full motion-safe:transition-all motion-safe:duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor ?? undefined }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(pct)}% z {formatCurrency(project.budget)}
              {total > project.budget && (
                <span className="text-destructive ml-2 font-medium">Przekroczony!</span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Brak budżetu</p>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edytuj budowę</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eh-name">
                Nazwa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="eh-name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                maxLength={120}
                autoCapitalize="words"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eh-address">Adres</Label>
              <Input
                id="eh-address"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="ul. Przykładowa 1, Warszawa"
                autoCapitalize="words"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eh-budget">Budżet</Label>
              <div className="relative">
                <Input
                  id="eh-budget"
                  value={form.budget}
                  onChange={e => set('budget', e.target.value)}
                  inputMode="numeric"
                  placeholder="500 000"
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  PLN
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eh-description">Opis</Label>
              <Textarea
                id="eh-description"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                className="resize-none"
                maxLength={1000}
              />
            </div>
          <Button className="w-full" size="lg" onClick={saveEdit} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Usuń budowę</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground px-0.5">
            Czy na pewno chcesz usunąć budowę <strong>"{project.name}"</strong>?
            Ta operacja jest nieodwracalna i usunie wszystkie koszty.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button variant="destructive" onClick={deleteProject} disabled={deleting}>
              {deleting ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
