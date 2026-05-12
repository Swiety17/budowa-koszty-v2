'use client'
import { useRef, useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Camera, ImagePlus, X, Sparkles, Loader2 } from 'lucide-react'
import type { CostCategory, ProjectStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import VendorInput from './VendorInput'

type Errors = { name?: string; amount?: string; date?: string }

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return isNaN(n) || n <= 0 ? null : n
}

const today = new Date().toISOString().split('T')[0]

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

  // Image / OCR state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrDone, setOcrDone] = useState(false)

  // Form fields — controlled so OCR can pre-fill them
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stageId, setStageId] = useState('')

  const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/vendors`)
      .then(r => r.ok ? r.json() : [])
      .then(setVendorSuggestions)
      .catch(() => {})
  }, [projectId])

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const amountRef  = useRef<HTMLInputElement>(null)
  const dateRef    = useRef<HTMLInputElement>(null)
  const vendorRef  = useRef<HTMLInputElement>(null)
  const notesRef   = useRef<HTMLTextAreaElement>(null)
  const formRef    = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)

  async function handleFile(file: File) {
    setImageFile(file)
    setOcrDone(false)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    await runOcr(file)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setOcrDone(false)
  }

  async function runOcr(file: File) {
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.set('image', file)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('OCR failed')
      const ocr = await res.json()
      if (ocr.name)       setName(ocr.name)
      if (ocr.vendor)     setVendor(ocr.vendor)
      if (ocr.amount)     setAmount(String(ocr.amount))
      if (ocr.date)       setDate(ocr.date)
      if (ocr.items_text) setNotes(ocr.items_text)
      setOcrDone(true)
      toast.success('Dane odczytane ze zdjęcia!')
    } catch {
      toast.error('Nie udało się odczytać danych — uzupełnij ręcznie')
    } finally {
      setOcrLoading(false)
    }
  }

  function validateName(v: string) {
    if (!v.trim()) return 'Nazwa jest wymagana'
    if (v.trim().length < 2) return 'Min. 2 znaki'
  }
  function validateAmount(v: string) {
    if (!v.trim()) return 'Kwota jest wymagana'
    if (parseAmount(v) === null) return 'Podaj poprawną kwotę'
  }
  function validateDate(v: string) {
    if (!v) return 'Data jest wymagana'
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (submitting.current) return
    submitting.current = true

    const nameErr   = validateName(name)
    const amountErr = validateAmount(amount)
    const dateErr   = validateDate(date)

    if (nameErr || amountErr || dateErr) {
      setTouched({ name: true, amount: true, date: true })
      setErrors({ name: nameErr, amount: amountErr, date: dateErr })
      submitting.current = false
      return
    }

    setLoading(true)
    try {
      let receipt_url: string | null = null

      if (imageFile) {
        const fd = new FormData()
        fd.set('image', imageFile)
        const uploadRes = await fetch(`/api/projects/${projectId}/receipts`, { method: 'POST', body: fd })
        if (!uploadRes.ok) {
          const { error } = await uploadRes.json().catch(() => ({}))
          toast.error(error ?? 'Błąd przesyłania zdjęcia')
          return
        }
        receipt_url = (await uploadRes.json()).url
      }

      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseAmount(amount)!,
          date,
          vendor: vendor.trim() || null,
          notes: notes.trim() || null,
          category_id: categoryId || null,
          stage_id: stageId || null,
          receipt_url,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Błąd serwera')
        return
      }
      toast.success('Koszt dodany!')
      router.push(`/projects/${projectId}`)
    } catch {
      toast.error('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 -ml-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {projectName}
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold">Nowy koszt</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Zeskanuj paragon lub wypełnij ręcznie</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {/* ── Photo / OCR section — PRIMARY action ── */}
        <div className="mb-6">
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Paragon" className="w-full max-h-72 object-contain" />

              {/* OCR loading overlay */}
              {ocrLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Odczytuję dane z paragonu…</p>
                </div>
              )}

              {/* OCR done badge */}
              {ocrDone && !ocrLoading && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    <Sparkles className="h-3 w-3" />
                    Dane odczytane
                  </span>
                </div>
              )}

              {/* Clear button */}
              <button
                type="button"
                onClick={clearImage}
                disabled={ocrLoading}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 active:bg-muted"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Zrób zdjęcie</p>
                  <p className="text-xs text-muted-foreground mt-0.5">aparat</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 active:bg-muted"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <ImagePlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Z galerii</p>
                  <p className="text-xs text-muted-foreground mt-0.5">lub dysku</p>
                </div>
              </button>
            </div>
          )}

          {/* hidden inputs */}
          <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInput} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleInput} />
        </div>

        {/* ── Manual form fields ── */}
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nazwa <span className="text-destructive ml-0.5">*</span>
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
              placeholder="np. Materiały budowlane"
              autoCapitalize="sentences"
              enterKeyHint="next"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus() } }}
              className={cn(errors.name && touched.name && 'border-destructive focus-visible:ring-destructive')}
              disabled={loading || ocrLoading}
            />
            {errors.name && touched.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Kwota <span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  ref={amountRef}
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
                  placeholder="0"
                  className={cn('pr-14', errors.amount && touched.amount && 'border-destructive focus-visible:ring-destructive')}
                  enterKeyHint="next"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dateRef.current?.focus() } }}
                  disabled={loading || ocrLoading}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">PLN</span>
              </div>
              {errors.amount && touched.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                Data <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="date"
                ref={dateRef}
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value)
                  if (touched.date) setErrors(p => ({ ...p, date: validateDate(e.target.value) }))
                }}
                onBlur={e => {
                  setTouched(p => ({ ...p, date: true }))
                  setErrors(p => ({ ...p, date: validateDate(e.target.value) }))
                }}
                className={cn(errors.date && touched.date && 'border-destructive focus-visible:ring-destructive')}
                disabled={loading || ocrLoading}
              />
              {errors.date && touched.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor">
              Wykonawca / dostawca
              <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
            </Label>
            <VendorInput
              id="vendor"
              value={vendor}
              onChange={setVendor}
              suggestions={vendorSuggestions}
              disabled={loading || ocrLoading}
            />
          </div>

          {/* Category + Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">
                Kategoria
                <span className="text-xs text-muted-foreground ml-1.5">(opc.)</span>
              </Label>
              <select
                id="category_id"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                disabled={loading || ocrLoading}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">Brak</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {stages.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="stage_id">
                  Etap
                  <span className="text-xs text-muted-foreground ml-1.5">(opc.)</span>
                </Label>
                <select
                  id="stage_id"
                  value={stageId}
                  onChange={e => setStageId(e.target.value)}
                  disabled={loading || ocrLoading}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                >
                  <option value="">Brak</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Uwagi / pozycje faktury
              <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
            </Label>
            <Textarea
              id="notes"
              ref={notesRef}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Dodatkowe informacje, nr faktury, pozycje…"
              maxLength={500}
              disabled={loading || ocrLoading}
              className="resize-none"
            />
          </div>
        </div>

        {/* Submit desktop */}
        <div className="mt-8 hidden md:block">
          <Button type="submit" className="w-full" size="lg" disabled={loading || ocrLoading}>
            {loading ? 'Zapisywanie…' : ocrLoading ? 'Odczytuję paragon…' : 'Dodaj koszt'}
          </Button>
        </div>
      </form>

      {/* Submit mobile — sticky above BottomNav */}
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
