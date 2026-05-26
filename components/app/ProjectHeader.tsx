'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Settings, Pencil, Users, Download, Trash2 } from 'lucide-react'
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

function BudgetBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height: 8, background: 'var(--color-surface3)' }}>
      <div
        className="h-full rounded-full motion-safe:transition-all motion-safe:duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export default function ProjectHeader({
  project: initial,
  total,
  isOwner,
  costCount,
  stageCount,
}: {
  project: Project
  total: number
  isOwner: boolean
  costCount?: number
  stageCount?: number
}) {
  const router = useRouter()
  const [project, setProject] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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
    pct === null ? null
    : pct < 75   ? 'var(--color-success)'
    : pct < 95   ? 'var(--color-warning)'
    :               'var(--color-danger)'

  return (
    <>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
        Budowy
      </Link>

      {/* Project card */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}
      >
        {/* Name row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-xl font-bold leading-snug"
                style={{ color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}
              >
                {project.name}
              </h1>
              {!isOwner && (
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[11px] px-2 py-0 rounded-full"
                  style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)', border: 'none' }}
                >
                  Wspólny
                </Badge>
              )}
            </div>
            {project.address && (
              <div className="flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="text-xs truncate">{project.address}</span>
              </div>
            )}
          </div>

          {/* Gear menu */}
          {isOwner && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, color: 'var(--color-muted)', background: 'var(--color-surface2)' }}
                aria-label="Opcje projektu"
              >
                <Settings className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-10 z-30 rounded-2xl overflow-hidden animate-sheet-up"
                  style={{
                    minWidth: 210,
                    background: 'var(--color-surface)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                    border: '0.5px solid var(--color-border)',
                  }}
                >
                  {[
                    { icon: Pencil,   label: 'Edytuj projekt',     color: '#3b82f6', action: () => { setMenuOpen(false); setEditOpen(true) } },
                    { icon: Users,    label: 'Zarządzaj dostępem', color: '#8b5cf6', action: () => { setMenuOpen(false) } },
                    { icon: Download, label: 'Eksport CSV',         color: '#14b8a6', action: () => { setMenuOpen(false) } },
                  ].map(({ icon: Icon, label, color, action }, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={action}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left"
                      style={{
                        borderBottom: i < 2 ? '0.5px solid var(--color-border)' : undefined,
                        color: 'var(--color-foreground)',
                      }}
                    >
                      <div className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: color }}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setDeleteOpen(true) }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <div className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: 'var(--color-danger)' }}>
                      <Trash2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">Usuń projekt</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <p
          className="text-[26px] font-extrabold"
          style={{ color: 'var(--color-foreground)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
        >
          {formatCurrency(total)}
        </p>

        {/* Budget bar */}
        {project.budget && pct !== null && (
          <div className="space-y-1.5">
            <BudgetBar pct={pct} color={barColor!} />
            <div className="flex justify-between items-baseline">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                z {formatCurrency(project.budget)}
                {total > project.budget && (
                  <span className="ml-2 font-medium" style={{ color: 'var(--color-danger)' }}>Przekroczony!</span>
                )}
              </p>
              <span className="text-sm font-bold" style={{ color: barColor ?? undefined }}>
                {Math.round(pct)}%
              </span>
            </div>
          </div>
        )}
        {!project.budget && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Brak budżetu</p>
        )}

        {/* Stats strip */}
        {(costCount !== undefined || stageCount !== undefined) && (
          <div
            className="flex items-center gap-0 pt-2.5"
            style={{ borderTop: '0.5px solid var(--color-border)' }}
          >
            {costCount !== undefined && (
              <div className="flex-1 text-center">
                <div className="text-base font-bold" style={{ color: 'var(--color-foreground)' }}>{costCount}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>kosztów</div>
              </div>
            )}
            {costCount !== undefined && stageCount !== undefined && (
              <div style={{ width: '0.5px', height: 32, background: 'var(--color-border)' }} />
            )}
            {stageCount !== undefined && (
              <div className="flex-1 text-center">
                <div className="text-base font-bold" style={{ color: 'var(--color-foreground)' }}>{stageCount}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>etapów</div>
              </div>
            )}
          </div>
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
