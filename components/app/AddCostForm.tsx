'use client'
import { useRef, useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Camera, ImagePlus, X, Sparkles, Loader2, ChevronDown } from 'lucide-react'
import type { CostCategory, ProjectStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import VendorInput from './VendorInput'

type Errors = { name?: string; amount?: string }

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return isNaN(n) || n <= 0 ? null : n
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]
}
function formatDateChip(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export default function AddCostForm({
  projectId,
  projectName,
  categories,
  stages,
}: {
  projectId: string
  projectName: string
  categories: CostCategory[]
  stages: ProjectStage[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Image / OCR
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrDone, setOcrDone] = useState(false)

  // Core fields
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  // Date chips
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today')
  const [customDate, setCustomDate] = useState(todayStr)

  // Optional fields
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stageId, setStageId] = useState('')
  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([])

  // Which optional sections are expanded
  const [showVendor, setShowVendor] = useState(false)
  const [showCategory, setShowCategory] = useState(false)
  const [showStage, setShowStage] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)

  const date = dateMode === 'today' ? todayStr() : dateMode === 'yesterday' ? yesterdayStr() : customDate

  useEffect(() => {
    fetch(`/api/projects/${projectId}/vendors`)
      .then(r => r.ok ? r.json() : [])
      .then(setVendorSuggestions)
      .catch(() => {})
  }, [projectId])

  function applyOcr(ocr: Record<string, string | number>) {
    if (ocr.name)   setName(String(ocr.name))
    if (ocr.amount) setAmount(String(ocr.amount))
    if (ocr.vendor) { setVendor(String(ocr.vendor)); setShowVendor(true) }
    if (ocr.items_text) { setNotes(String(ocr.items_text)); setShowNotes(true) }
    if (ocr.date) {
      const d = String(ocr.date)
      if (d === todayStr())     setDateMode('today')
      else if (d === yesterdayStr()) setDateMode('yesterday')
      else { setCustomDate(d); setDateMode('custom') }
    }
  }

  async function handleFile(file: File) {
    setImageFile(file)
    setOcrDone(false)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)

    setOcrLoading(true)
    try {
      const fd = new FormData(); fd.set('image', file)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('OCR failed')
      applyOcr(await res.json())
      setOcrDone(true)
      toast.success('Dane odczytane ze zdjęcia!')
    } catch {
      toast.error('Nie udało się odczytać danych — uzupełnij ręcznie')
    } finally {
      setOcrLoading(false)
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function validateName(v: string) {
    if (!v.trim()) return 'Wymagane'
    if (v.trim().length < 2) return 'Min. 2 znaki'
  }
  function validateAmount(v: string) {
    if (!v.trim()) return 'Wymagana'
    if (parseAmount(v) === null) return 'Niepoprawna kwota'
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (submitting.current) return
    submitting.current = true

    const nameErr = validateName(name)
    const amountErr = validateAmount(amount)
    if (nameErr || amountErr) {
      setTouched({ name: true, amount: true })
      setErrors({ name: nameErr, amount: amountErr })
      submitting.current = false
      return
    }

    setLoading(true)
    try {
      let receipt_url: string | null = null
      if (imageFile) {
        const fd = new FormData(); fd.set('image', imageFile)
        const up = await fetch(`/api/projects/${projectId}/receipts`, { method: 'POST', body: fd })
        if (!up.ok) { const { error } = await up.json().catch(() => ({})); toast.error(error ?? 'Błąd przesyłania'); return }
        receipt_url = (await up.json()).url
      }

      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), amount: parseAmount(amount)!, date,
          vendor: vendor.trim() || null,
          notes: notes.trim() || null,
          category_id: categoryId || null,
          stage_id: stageId || null,
          receipt_url,
        }),
      })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd serwera'); return }
      toast.success('Koszt dodany!')
      router.push(`/projects/${projectId}`)
    } catch {
      toast.error('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const selectedCategory = categories.find(c => c.id === categoryId)
  const selectedStage    = stages.find(s => s.id === stageId)

  return (
    <div className="max-w-lg mx-auto pb-28">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 -ml-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {projectName}
      </Link>

      <h1 className="text-xl font-bold mb-6">Nowy koszt</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Paragon / OCR ── */}
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Paragon" className="w-full max-h-48 object-contain" />
            {ocrLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm font-medium">Odczytuję paragon…</p>
              </div>
            )}
            {ocrDone && !ocrLoading && (
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white">
                  <Sparkles className="h-3 w-3" />
                  Dane odczytane
                </span>
              </div>
            )}
            <button
              type="button"
              aria-label="Usuń zdjęcie paragonu"
              onClick={() => { setImageFile(null); setImagePreview(null); setOcrDone(false) }}
              disabled={ocrLoading}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              <Camera className="h-4 w-4" />
              Zrób zdjęcie
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
              Z galerii
            </button>
          </div>
        )}
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInput} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleInput} />

        {/* ── Kwota ── */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">
            Kwota <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="amount"
              value={amount}
              onChange={e => {
                setAmount(e.target.value)
                if (touched.amount) setErrors(p => ({ ...p, amount: validateAmount(e.target.value) }))
              }}
              onBlur={e => {
                setTouched(p => ({ ...p, amount: true }))
                setErrors(p => ({ ...p, amount: validateAmount(e.target.value) }))
              }}
              inputMode="decimal"
              placeholder="0,00"
              className={cn(
                'h-14 text-2xl font-bold pr-16 tracking-tight',
                errors.amount && touched.amount && 'border-destructive',
              )}
              disabled={loading || ocrLoading}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              PLN
            </span>
          </div>
          {errors.amount && touched.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
        </div>

        {/* ── Co kupiono ── */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Co kupiono? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={e => {
              setName(e.target.value)
              if (touched.name) setErrors(p => ({ ...p, name: validateName(e.target.value) }))
            }}
            onBlur={e => {
              setTouched(p => ({ ...p, name: true }))
              setErrors(p => ({ ...p, name: validateName(e.target.value) }))
            }}
            maxLength={200}
            placeholder="np. Cement, materiały, usługa…"
            autoCapitalize="sentences"
            className={cn(errors.name && touched.name && 'border-destructive')}
            disabled={loading || ocrLoading}
          />
          {errors.name && touched.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* ── Kiedy (date chips) ── */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateMode(mode)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
                  dateMode === mode
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                )}
              >
                {mode === 'today' ? 'Dzisiaj' : 'Wczoraj'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDateMode('custom')}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
                dateMode === 'custom'
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {dateMode === 'custom' ? formatDateChip(customDate) : 'Inna data…'}
            </button>
          </div>
          {dateMode === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              autoFocus
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          )}
        </div>

        {/* ── Pola opcjonalne (labeled rows) ── */}
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">

          {/* Wykonawca */}
          <div>
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowVendor(s => !s)}
                className="flex flex-1 items-center gap-3 text-left min-w-0"
                aria-expanded={showVendor}
              >
                <span className="text-sm text-muted-foreground w-24 shrink-0">Wykonawca</span>
                {vendor ? (
                  <span className="text-sm truncate flex-1">{vendor}</span>
                ) : (
                  <span className="flex flex-1 items-center justify-between">
                    <span className="text-sm text-muted-foreground/60">Nie wybrano</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showVendor && 'rotate-180')} />
                  </span>
                )}
              </button>
              {vendor && (
                <button
                  type="button"
                  aria-label="Usuń wykonawcę"
                  onClick={() => { setVendor(''); setShowVendor(false) }}
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showVendor && (
              <div className="px-4 pb-3">
                <VendorInput
                  id="vendor"
                  value={vendor}
                  onChange={setVendor}
                  suggestions={vendorSuggestions}
                  placeholder="np. Firma XYZ, Jan Kowalski…"
                  disabled={loading || ocrLoading}
                />
              </div>
            )}
          </div>

          {/* Kategoria */}
          <div>
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowCategory(s => !s)}
                className="flex flex-1 items-center gap-3 text-left min-w-0"
                aria-expanded={showCategory}
              >
                <span className="text-sm text-muted-foreground w-24 shrink-0">Kategoria</span>
                {selectedCategory ? (
                  <span className="flex flex-1 items-center min-w-0 gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedCategory.color }} />
                    <span className="text-sm truncate">{selectedCategory.name}</span>
                  </span>
                ) : (
                  <span className="flex flex-1 items-center justify-between">
                    <span className="text-sm text-muted-foreground/60">Nie wybrano</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showCategory && 'rotate-180')} />
                  </span>
                )}
              </button>
              {selectedCategory && (
                <button
                  type="button"
                  aria-label="Usuń kategorię"
                  onClick={() => { setCategoryId(''); setShowCategory(false) }}
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showCategory && categories.length > 0 && (
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCategoryId(categoryId === c.id ? '' : c.id); setShowCategory(false) }}
                    className={cn(
                      'cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                      categoryId === c.id
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Etap */}
          {stages.length > 0 && (
            <div>
              <div className="flex w-full items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowStage(s => !s)}
                  className="flex flex-1 items-center gap-3 text-left min-w-0"
                  aria-expanded={showStage}
                >
                  <span className="text-sm text-muted-foreground w-24 shrink-0">Etap</span>
                  {selectedStage ? (
                    <span className="text-sm truncate flex-1">{selectedStage.name}</span>
                  ) : (
                    <span className="flex flex-1 items-center justify-between">
                      <span className="text-sm text-muted-foreground/60">Nie wybrano</span>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showStage && 'rotate-180')} />
                    </span>
                  )}
                </button>
                {selectedStage && (
                  <button
                    type="button"
                    aria-label="Usuń etap"
                    onClick={() => { setStageId(''); setShowStage(false) }}
                    className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showStage && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {stages.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setStageId(stageId === s.id ? '' : s.id); setShowStage(false) }}
                      className={cn(
                        'cursor-pointer inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                        stageId === s.id
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground',
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notatki */}
          <div>
            {showNotes ? (
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Notatki</span>
                  <button
                    type="button"
                    onClick={() => { setNotes(''); setShowNotes(false) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Usuń
                  </button>
                </div>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Nr faktury, pozycje, dodatkowe informacje…"
                  maxLength={500}
                  disabled={loading || ocrLoading}
                  className="resize-none"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm text-muted-foreground w-24 shrink-0">Notatki</span>
                <span className="flex flex-1 items-center justify-between">
                  <span className="text-sm text-muted-foreground/60">Nie dodano</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            )}
          </div>

        </div>

        {/* Submit — desktop */}
        <div className="mt-8 hidden md:block">
          <Button type="submit" className="w-full" size="lg" disabled={loading || ocrLoading}>
            {loading ? 'Zapisywanie…' : ocrLoading ? 'Odczytuję paragon…' : 'Zapisz koszt'}
          </Button>
        </div>
      </form>

      {/* Submit — mobile sticky */}
      <div
        className="fixed left-0 right-0 md:hidden z-40 px-4 pt-3 pb-3 bg-background/90 backdrop-blur-sm border-t border-border"
        style={{ bottom: 'calc(4rem + var(--safe-bottom, 0px))' }}
      >
        <Button
          size="lg"
          className="w-full"
          disabled={loading || ocrLoading}
          onClick={() => handleSubmit()}
        >
          {loading ? 'Zapisywanie…' : ocrLoading ? 'Odczytuję paragon…' : 'Dodaj koszt'}
        </Button>
      </div>
    </div>
  )
}
