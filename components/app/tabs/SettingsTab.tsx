'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, UserPlus, Users } from 'lucide-react'
import type { CostCategory, BudowaMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-1"
          style={{ backgroundColor: c, boxShadow: value === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : undefined }}
        />
      ))}
    </div>
  )
}

function CategoryRow({
  cat,
  onUpdated,
  onDeleted,
}: {
  cat: CostCategory
  onUpdated: (c: CostCategory) => void
  onDeleted: (id: string) => void
}) {
  const isGlobal = !cat.user_id
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Podaj nazwę'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!res.ok) { toast.error('Błąd zapisu'); return }
      onUpdated(await res.json())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Błąd usuwania'); return }
      onDeleted(cat.id)
      setDeleteOpen(false)
      toast.success('Kategoria usunięta')
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="p-4 space-y-3 bg-muted/30 rounded-xl border border-border">
        <Input value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={80} />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Zapisuję…' : 'Zapisz'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(cat.name); setColor(cat.color) }}>
            <X className="h-3.5 w-3.5 mr-1" />
            Anuluj
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
        <p className="flex-1 text-sm font-medium">{cat.name}</p>
        {isGlobal && (
          <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
            domyślna
          </span>
        )}
        {!isGlobal && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Usuń kategorię</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć kategorię <strong>"{cat.name}"</strong>?
            Koszty przypisane do niej zachowają dane — stracą tylko przypisanie.
          </p>
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

function AddCategoryForm({ onAdded }: { onAdded: (c: CostCategory) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[4])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Podaj nazwę kategorii'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!res.ok) { toast.error('Błąd dodawania'); return }
      onAdded(await res.json())
      setName('')
      setColor(COLORS[4])
      toast.success('Kategoria dodana')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nowa kategoria</p>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="np. Materiały, Robocizna…"
        maxLength={80}
        onKeyDown={e => e.key === 'Enter' && save()}
      />
      <ColorPicker value={color} onChange={setColor} />
      <Button size="sm" onClick={save} disabled={saving || !name.trim()}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        {saving ? 'Dodaję…' : 'Dodaj kategorię'}
      </Button>
    </div>
  )
}

function MembersSection({
  projectId,
  members,
  onMembersChange,
}: {
  projectId: string
  members: BudowaMember[]
  onMembersChange: (m: BudowaMember[]) => void
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function invite() {
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invited_email: email.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(res.status === 409 ? 'Ten email już ma dostęp' : (body.error ?? 'Błąd'))
        return
      }
      onMembersChange([...members, await res.json()])
      setEmail('')
      toast.success('Użytkownik zaproszony')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/projects/${projectId}/members/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Błąd usuwania'); return }
    onMembersChange(members.filter(m => m.id !== id))
    toast.success('Usunięto dostęp')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Dostęp do budowy</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Zaproszeni użytkownicy mogą przeglądać i edytować koszty tej budowy.
      </p>

      {members.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0">
                {m.invited_email[0].toUpperCase()}
              </div>
              <p className="flex-1 text-sm truncate">{m.invited_email}</p>
              <button
                onClick={() => remove(m.id)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && invite()}
          className="flex-1"
        />
        <Button onClick={invite} disabled={loading || !email.trim()} size="sm">
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          {loading ? 'Wysyłam…' : 'Zaproś'}
        </Button>
      </div>
    </div>
  )
}

export default function SettingsTab({
  projectId,
  isOwner,
  categories,
  onCategoriesChange,
  members,
  onMembersChange,
}: {
  projectId: string
  isOwner: boolean
  categories: CostCategory[]
  onCategoriesChange: (cats: CostCategory[]) => void
  members: BudowaMember[]
  onMembersChange: (m: BudowaMember[]) => void
}) {
  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-border" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">Kategorie kosztów</p>
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        {categories.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {categories.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                onUpdated={updated => onCategoriesChange(categories.map(c => c.id === updated.id ? updated : c))}
                onDeleted={id => onCategoriesChange(categories.filter(c => c.id !== id))}
              />
            ))}
          </div>
        )}
        <AddCategoryForm onAdded={cat => onCategoriesChange([...categories, cat])} />
      </div>

      {/* Members — only owner */}
      {isOwner && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-border" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">Współpraca</p>
            <div className="h-1 flex-1 rounded-full bg-border" />
          </div>
          <MembersSection
            projectId={projectId}
            members={members}
            onMembersChange={onMembersChange}
          />
        </div>
      )}
    </div>
  )
}
