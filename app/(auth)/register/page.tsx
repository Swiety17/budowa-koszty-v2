'use client'
import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Konto utworzone! Sprawdź email w celu potwierdzenia.')
      router.push('/login')
    } catch {
      toast.error('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3">
          <span className="text-primary-foreground text-xl font-bold">B</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Budowa Koszty</h1>
        <p className="text-muted-foreground text-sm mt-1">Utwórz nowe konto</p>
      </div>

      <Card className="border-0 shadow-none md:border md:shadow-sm">
        <CardHeader className="pb-4 hidden md:block">
          <CardTitle className="text-xl">Rejestracja</CardTitle>
          <CardDescription>Wypełnij dane, by zacząć śledzić koszty</CardDescription>
        </CardHeader>

        <CardContent className="px-0 md:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="jan@kowalski.pl"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                autoCapitalize="off"
                autoCorrect="off"
                enterKeyHint="go"
                minLength={6}
                placeholder="min. 6 znaków"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Tworzenie konta…' : 'Zarejestruj się'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center px-0 md:px-6 pt-2">
          <p className="text-sm text-muted-foreground">
            Masz już konto?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
