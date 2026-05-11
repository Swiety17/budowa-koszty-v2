'use client'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Receipt } from 'lucide-react'
import type { CostCategory, ProjectStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type Errors = { name?: string; amount?: string; date?: string }

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return isNaN(n) || n <= 0 ? null : n
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

  const formRef    = useRef<HTMLFormElement>(null)
  const amountRef  = useRef<HTMLInputElement>(null)
  const dateRef    = useRef<HTMLInputElement>(null)
  const vendorRef  = useRef<HTMLInputElement>(null)
  const notesRef   = useRef<HTMLTextAreaElement>(null)

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name   = (fd.get('name') as string).trim()
    const amount = fd.get('amount') as string
    const date   = fd.get('date') as string

    const nameErr   = validateName(name)
    const amountErr = validateAmount(amount)
    const dateErr   = validateDate(date)

    if (nameErr || amountErr || dateErr) {
      setTouched({ name: true, amount: true, date: true })
      setErrors({ name: nameErr, amount: amountErr, date: dateErr })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amount:      parseAmount(amount)!,
          date,
          vendor:      (fd.get('vendor') as string).trim() || null,
          notes:       (fd.get('notes') as string).trim() || null,
          category_id: (fd.get('category_id') as string) || null,
          stage_id:    (fd.get('stage_id') as string) || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Błąd serwera')
        return
      }
      toast.success('Koszt dodany')
      router.push(`/projects/${projectId}`)
    } catch {
      toast.error('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto">
      {/* Back */}
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 -ml-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {projectName}
      </Link>

      {/* Title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nowy koszt</h1>
          <p className="text-sm text-muted-foreground">Dodaj pozycję kosztową</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nazwa <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            autoFocus
            maxLength={200}
            placeholder="np. Materiały budowlane"
            autoCapitalize="sentences"
            enterKeyHint="next"
            onBlur={e => {
              setTouched(p => ({ ...p, name: true }))
              setErrors(p => ({ ...p, name: validateName(e.target.value) }))
            }}
            onChange={e => {
              if (touched.name) setErrors(p => ({ ...p, name: validateName(e.target.value) }))
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus() }
            }}
            className={cn(errors.name && touched.name && 'border-destructive focus-visible:ring-destructive')}
            disabled={loading}
          />
          {errors.name && touched.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 my-6">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase shrink-0">
            Szczegóły
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-5">
          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Kwota <span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  name="amount"
                  ref={amountRef}
                  inputMode="decimal"
                  placeholder="0"
                  className={cn('pr-14', errors.amount && touched.amount && 'border-destructive focus-visible:ring-destructive')}
                  enterKeyHint="next"
                  onBlur={e => {
                    setTouched(p => ({ ...p, amount: true }))
                    setErrors(p => ({ ...p, amount: validateAmount(e.target.value) }))
                  }}
                  onChange={e => {
                    if (touched.amount) setErrors(p => ({ ...p, amount: validateAmount(e.target.value) }))
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); dateRef.current?.focus() }
                  }}
                  disabled={loading}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  PLN
                </span>
              </div>
              {errors.amount && touched.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                Data <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="date"
                name="date"
                ref={dateRef}
                type="date"
                defaultValue={today}
                className={cn(errors.date && touched.date && 'border-destructive focus-visible:ring-destructive')}
                enterKeyHint="next"
                onBlur={e => {
                  setTouched(p => ({ ...p, date: true }))
                  setErrors(p => ({ ...p, date: validateDate(e.target.value) }))
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); vendorRef.current?.focus() }
                }}
                disabled={loading}
              />
              {errors.date && touched.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor">
              Wykonawca / dostawca
              <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
            </Label>
            <Input
              id="vendor"
              name="vendor"
              ref={vendorRef}
              placeholder="np. Firma Budowlana XYZ"
              autoCapitalize="words"
              enterKeyHint="next"
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); notesRef.current?.focus() }
              }}
              disabled={loading}
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
                name="category_id"
                disabled={loading}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
              >
                <option value="">Brak</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
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
                  name="stage_id"
                  disabled={loading}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                >
                  <option value="">Brak</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Uwagi
              <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              ref={notesRef}
              rows={3}
              placeholder="Dodatkowe informacje, nr faktury…"
              maxLength={500}
              disabled={loading}
              className="resize-none"
            />
          </div>
        </div>

        {/* Submit desktop */}
        <div className="mt-8 hidden md:block">
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Zapisywanie…' : 'Dodaj koszt'}
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
          disabled={loading}
          onClick={() => formRef.current?.requestSubmit()}
        >
          {loading ? 'Zapisywanie…' : 'Dodaj koszt'}
        </Button>
      </div>
    </div>
  )
}
