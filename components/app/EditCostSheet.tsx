'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { Cost, CostCategory, ProjectStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Form = {
  name: string
  amount: string
  date: string
  vendor: string
  notes: string
  category_id: string
  stage_id: string
}

function costToForm(cost: Cost): Form {
  return {
    name: cost.name,
    amount: String(cost.amount),
    date: cost.date,
    vendor: cost.vendor ?? '',
    notes: cost.notes ?? '',
    category_id: cost.category_id ?? '',
    stage_id: cost.stage_id ?? '',
  }
}

export default function EditCostSheet({
  cost,
  projectId,
  open,
  onOpenChange,
  categories,
  stages,
  onUpdated,
}: {
  cost: Cost | null
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CostCategory[]
  stages: ProjectStage[]
  onUpdated: (updated: Cost) => void
}) {
  const [form, setForm] = useState<Form>({
    name: '', amount: '', date: new Date().toISOString().split('T')[0],
    vendor: '', notes: '', category_id: '', stage_id: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cost) setForm(costToForm(cost))
  }, [cost])

  function set<K extends keyof Form>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSubmit() {
    if (!cost) return
    if (!form.name.trim()) { toast.error('Nazwa jest wymagana'); return }
    const amount = Number(form.amount.replace(',', '.').replace(/\s/g, ''))
    if (isNaN(amount) || amount <= 0) { toast.error('Podaj poprawną kwotę'); return }
    if (!form.date) { toast.error('Data jest wymagana'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/costs/${cost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          date: form.date,
          vendor: form.vendor.trim() || null,
          notes: form.notes.trim() || null,
          category_id: form.category_id || null,
          stage_id: form.stage_id || null,
        }),
      })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd serwera'); return }
      const data = await res.json()
      onUpdated(data as Cost)
      onOpenChange(false)
      toast.success('Koszt zaktualizowany')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edytuj koszt</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ec-name">
              Nazwa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ec-name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              maxLength={200}
              autoCapitalize="sentences"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ec-amount">
                Kwota <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="ec-amount"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  PLN
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-date">
                Data <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ec-date"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ec-vendor">Wykonawca / dostawca</Label>
            <Input
              id="ec-vendor"
              value={form.vendor}
              onChange={e => set('vendor', e.target.value)}
              placeholder="np. Firma XYZ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ec-category">Kategoria</Label>
              <select
                id="ec-category"
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">Brak</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-stage">Etap</Label>
              <select
                id="ec-stage"
                value={form.stage_id}
                onChange={e => set('stage_id', e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">Brak</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ec-notes">Uwagi</Label>
            <Textarea
              id="ec-notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="resize-none"
              maxLength={500}
              placeholder="Opcjonalne uwagi…"
            />
          </div>
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
