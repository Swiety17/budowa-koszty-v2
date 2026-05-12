import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_EXT   = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

function extractPath(url: string): string | null {
  const marker = '/storage/v1/object/public/receipts/'
  const idx = url.indexOf(marker)
  return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return Response.json({ error: 'Brak pliku' }, { status: 400 })
  if (image.size > 10 * 1024 * 1024) return Response.json({ error: 'Plik za duży (max 10 MB)' }, { status: 413 })

  const ext = image.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_TYPES.includes(image.type) || !ALLOWED_EXT.includes(ext))
    return Response.json({ error: 'Niedozwolony format — akceptowane: JPG, PNG, WEBP, HEIC' }, { status: 415 })

  const path = `${id}/${Date.now()}.${ext}`
  const buffer = await image.arrayBuffer()

  const { error } = await admin.storage
    .from('receipts')
    .upload(path, new Uint8Array(buffer), {
      contentType: image.type,
      upsert: false,
    })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('receipts').getPublicUrl(path)
  return Response.json({ url: publicUrl })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const { url } = await request.json()
  if (!url) return Response.json({ error: 'Brak URL' }, { status: 400 })

  const path = extractPath(url)
  if (!path) return Response.json({ error: 'Nieprawidłowy URL' }, { status: 400 })

  // Upewnij się że ścieżka należy do tego projektu
  if (!path.startsWith(`${id}/`))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin.storage.from('receipts').remove([path])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
