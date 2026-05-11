'use client'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type Errors = { name?: string }

function parseBudget(raw: string): number | null {
  // Strip spaces, swap comma-decimal to dot: '500 000,50' → 500000.50
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return isNaN(n) || n < 0 ? null : n
}

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const formRef    = useRef<HTMLFormElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const budgetRef  = useRef<HTMLInputElement>(null)
  const notesRef   = useRef<HTMLTextAreaElement>(null)

  function validateName(value: string): string | undefined {
    if (!value.trim()) return 'Nazwa jest wymagana'
    if (value.trim().length < 3) return 'Nazwa musi mieć min. 3 znaki'
  }

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    setTouched(p => ({ ...p, name: true }))
    setErrors(p => ({ ...p, name: validateName(e.target.value) }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()

    const nameError = validateName(name)
    if (nameError) {
      setTouched(p => ({ ...p, name: true }))
      setErrors({ name: nameError })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address:     (fd.get('address') as string).trim() || null,
          budget:      parseBudget(fd.get('budget') as string),
          description: (fd.get('description') as string).trim() || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Błąd serwera')
        return
      }
      const project = await res.json()
      router.push(`/projects/${project.id}`)
    } catch {
      toast.error('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 -ml-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Moje budowy
      </Link>

      {/* Title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nowa budowa</h1>
          <p className="text-sm text-muted-foreground">Uzupełnij dane swojej inwestycji</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {/* ── Nazwa ─────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nazwa budowy
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            autoFocus
            maxLength={120}
            placeholder="np. Dom jednorodzinny w Krakowie"
            enterKeyHint="next"
            autoCapitalize="words"
            onBlur={handleNameBlur}
            onChange={e => {
              if (touched.name) setErrors(p => ({ ...p, name: validateName(e.target.value) }))
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addressRef.current?.focus() }
            }}
            className={cn(errors.name && touched.name && 'border-destructive focus-visible:ring-destructive')}
            disabled={loading}
          />
          {errors.name && touched.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* ── Szczegóły ─────────────────────────────────── */}
        <div className="flex items-center gap-3 my-6">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase shrink-0">
            Szczegóły
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-5">
          {/* Adres + Budżet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">
                Adres
                <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
              </Label>
              <Input
                id="address"
                name="address"
                ref={addressRef}
                placeholder="ul. Przykładowa 1, Warszawa"
                autoComplete="street-address"
                autoCorrect="off"
                autoCapitalize="words"
                enterKeyHint="next"
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); budgetRef.current?.focus() }
                }}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">
                Budżet
                <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
              </Label>
              <div className="relative">
                <Input
                  id="budget"
                  name="budget"
                  ref={budgetRef}
                  inputMode="numeric"
                  placeholder="500 000"
                  className="pr-14"
                  enterKeyHint="next"
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); notesRef.current?.focus() }
                  }}
                  disabled={loading}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  PLN
                </span>
              </div>
            </div>
          </div>

          {/* Opis */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Opis
              <span className="text-xs text-muted-foreground ml-1.5">(opcjonalne)</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              ref={notesRef}
              rows={3}
              placeholder="Krótki opis budowy, uwagi do projektu…"
              enterKeyHint="done"
              maxLength={1000}
              disabled={loading}
              className="resize-none"
            />
          </div>
        </div>

        {/* ── Submit desktop ────────────────────────────── */}
        <div className="mt-8 hidden md:block">
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Tworzenie…' : 'Utwórz budowę'}
          </Button>
        </div>
      </form>

      {/* ── Submit mobile — sticky nad BottomNav ─────── */}
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
          {loading ? 'Tworzenie…' : 'Utwórz budowę'}
        </Button>
      </div>
    </div>
  )
}
