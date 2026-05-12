import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

const USER_PROMPT = `Przeanalizuj ten paragon lub fakturę i zwróć JSON z polami:
- name: zaproponuj najlepszy krótki tytuł kosztu (max 60 znaków) opisujący co zostało zakupione, np. "Cegły pełne 100 szt." lub "Materiały hydrauliczne" lub "Usługa murarska – Budmax". Zawsze zwróć coś konkretnego i po polsku. (string)
- vendor: nazwa sprzedawcy / firmy wystawiającej dokument (string lub null)
- amount: łączna kwota brutto do zapłaty jako liczba bez waluty (number lub null)
- date: data dokumentu w formacie YYYY-MM-DD — szukaj pól "Data sprzedaży", "Data wystawienia", "Data", "Dnia", "Termin" itp. (string lub null)
- items_text: jeśli dokument zawiera wiele pozycji, zwróć je jako jeden string w formacie "Nazwa pozycji: kwota zł" każda w nowej linii (np. "Cegły pełne 100szt: 250,00 zł\\nZaprawa murarska 5kg: 45,00 zł"). Jeśli jest tylko jedna pozycja lub brak szczegółów, zwróć null.

Odpowiedz TYLKO samym JSON, bez żadnego dodatkowego tekstu.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return Response.json({ error: 'Brak pliku' }, { status: 400 })
  if (image.size > 10 * 1024 * 1024) return Response.json({ error: 'Plik za duży' }, { status: 413 })

  const mediaType = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  const buffer = await image.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json({
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 60) : null,
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor : null,
      amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? parsed.amount : null,
      date: typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
      items_text: typeof parsed.items_text === 'string' ? parsed.items_text : null,
    })
  } catch {
    return Response.json({ error: 'Nie udało się odczytać paragonu' }, { status: 422 })
  }
}
