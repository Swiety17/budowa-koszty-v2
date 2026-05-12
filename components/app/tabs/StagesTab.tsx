'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, Layers } from 'lucide-react'
import type { ProjectStage } from '@/types'
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

function StageRow({
  stage,
  projectId,
  onUpdated,
  onDeleted,
}: {
  stage: ProjectStage
  projectId: string
  onUpdated: (s: ProjectStage) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Podaj nazwę'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!res.ok) { toast.error('Błąd zapisu'); return }
      onUpdated(await res.json())
      setEditing(false)
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/stages/${stage.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Błąd usuwania'); return }
      onDeleted(stage.id)
      setDeleteOpen(false)
      toast.success('Etap usunięty')
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="p-4 space-y-3 bg-muted/30 rounded-xl border border-border">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nazwa etapu"
          autoFocus
          maxLength={80}
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Zapisuję…' : 'Zapisz'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(stage.name); setColor(stage.color) }}>
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
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <p className="flex-1 text-sm font-medium">{stage.name}</p>
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
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Usuń etap</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć etap <strong>"{stage.name}"</strong>?
            Koszty przypisane do tego etapu pozostaną — stracą tylko przypisanie.
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

function AddStageForm({ projectId, onAdded }: { projectId: string; onAdded: (s: ProjectStage) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[4])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Podaj nazwę etapu'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (!res.ok) { toast.error('Błąd dodawania'); return }
      onAdded(await res.json())
      setName('')
      setColor(COLORS[4])
      toast.success('Etap dodany')
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nowy etap</p>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="np. Stan surowy, Wykończenie…"
        maxLength={80}
        onKeyDown={e => e.key === 'Enter' && save()}
      />
      <ColorPicker value={color} onChange={setColor} />
      <Button size="sm" onClick={save} disabled={saving || !name.trim()}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        {saving ? 'Dodaję…' : 'Dodaj etap'}
      </Button>
    </div>
  )
}

export default function StagesTab({
  projectId,
  stages,
  onStagesChange,
}: {
  projectId: string
  stages: ProjectStage[]
  onStagesChange: (stages: ProjectStage[]) => void
}) {
  return (
    <div className="space-y-4">
      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <Layers className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Brak etapów</p>
            <p className="text-sm text-muted-foreground mt-1">Dodaj etapy, żeby śledzić postęp budowy</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {stages.map(stage => (
            <StageRow
              key={stage.id}
              stage={stage}
              projectId={projectId}
              onUpdated={updated => onStagesChange(stages.map(s => s.id === updated.id ? updated : s))}
              onDeleted={id => onStagesChange(stages.filter(s => s.id !== id))}
            />
          ))}
        </div>
      )}
      <AddStageForm
        projectId={projectId}
        onAdded={s => onStagesChange([...stages, s])}
      />
    </div>
  )
}
