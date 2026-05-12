'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Camera, X, Sparkles } from 'lucide-react'
import type { Cost, CostCategory, ProjectStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import VendorInput from './VendorInput'

type Form = {
  name: string
  amount: string
  date: string
  vendor: string
  notes: string
  category_id: string
  stage_id: string
  receipt_url: string
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
    receipt_url: cost.receipt_url ?? '',
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
    vendor: '', notes: '', category_id: '', stage_id: '', receipt_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [ocrDone, setOcrDone] = useState(false)
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const savedReceiptRef = useRef<string>('')

  useEffect(() => {
    if (cost) {
      setForm(costToForm(cost))
      savedReceiptRef.current = cost.receipt_url ?? ''
      setOcrDone(false)
    }
  }, [cost])

  useEffect(() => {
    if (open) {
      fetch(`/api/projects/${projectId}/vendors`)
        .then(r => r.ok ? r.json() : [])
        .then(setVendorSuggestions)
        .catch(() => {})
    }
  }, [open, projectId])

  async function handleOpenChange(open: boolean) {
    if (!open && !saving) {
      const current = form.receipt_url
      const original = savedReceiptRef.current
      // If user uploaded a new file but cancelled without saving, clean it up
      if (current && current !== original) {
        fetch(`/api/projects/${projectId}/receipts`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: current }),
        }).catch(() => {})
      }
    }
    onOpenChange(open)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !cost) return
    setUploading(true)
    setOcrDone(false)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`/api/projects/${projectId}/receipts`, { method: 'POST', body: fd })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd przesyłania'); return }
      const { url } = await res.json()
      set('receipt_url', url)

      // OCR: auto-fill only empty fields
      const ocrFd = new FormData()
      ocrFd.append('image', file)
      const ocrRes = await fetch('/api/ocr', { method: 'POST', body: ocrFd })
      if (ocrRes.ok) {
        const ocr = await ocrRes.json()
        // Read current form state directly (not via updater) to decide what to fill
        setForm(prev => {
          const next = { ...prev }
          if (ocr.name && !prev.name) next.name = ocr.name
          if (ocr.vendor && !prev.vendor) next.vendor = ocr.vendor
          if (ocr.amount && !prev.amount) next.amount = String(ocr.amount)
          if (ocr.date && !prev.date) next.date = ocr.date
          return next
        })
        // Check against form snapshot captured when async fn started
        const wouldFill =
          (ocr.name && !form.name) ||
          (ocr.vendor && !form.vendor) ||
          (ocr.amount && !form.amount) ||
          (ocr.date && !form.date)
        if (wouldFill) setOcrDone(true)
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

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
          receipt_url: form.receipt_url || null,
        }),
      })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd serwera'); return }
      const data = await res.json()
      savedReceiptRef.current = data.receipt_url ?? ''
      onUpdated(data as Cost)
      onOpenChange(false)
      toast.success('Koszt zaktualizowany')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
            <VendorInput
              id="ec-vendor"
              value={form.vendor}
              onChange={v => set('vendor', v)}
              suggestions={vendorSuggestions}
              placeholder="np. Firma XYZ"
              disabled={saving || uploading}
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

          {/* Receipt upload */}
          <div className="space-y-2">
            <Label>Paragon / zdjęcie</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            {form.receipt_url ? (
              <div className="flex items-start gap-3">
                <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-border bg-muted shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.receipt_url} alt="Paragon" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  {ocrDone && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Sparkles className="h-3 w-3" />
                      Dane odczytane
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {uploading ? 'Przesyłanie…' : 'Zmień zdjęcie'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { set('receipt_url', ''); setOcrDone(false) }}
                    className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Usuń zdjęcie
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors disabled:opacity-50 w-full"
              >
                <Camera className="h-4 w-4 shrink-0" />
                {uploading ? 'Przesyłanie i odczytywanie…' : 'Dodaj zdjęcie paragonu'}
              </button>
            )}
          </div>

          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
