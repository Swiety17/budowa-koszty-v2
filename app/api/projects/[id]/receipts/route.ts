import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return Response.json({ error: 'Brak pliku' }, { status: 400 })
  if (image.size > 10 * 1024 * 1024) return Response.json({ error: 'Plik za duży (max 10 MB)' }, { status: 413 })

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const ALLOWED_EXT   = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
  const ext = image.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_TYPES.includes(image.type) || !ALLOWED_EXT.includes(ext))
    return Response.json({ error: 'Niedozwolony format — akceptowane: JPG, PNG, WEBP, HEIC' }, { status: 415 })

  const path = `${id}/${Date.now()}.${ext}`
  const buffer = await image.arrayBuffer()

  const { error } = await admin.storage
    .from('receipts')
    .upload(path, new Uint8Array(buffer), {
      contentType: image.type || 'image/jpeg',
      upsert: false,
    })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('receipts').getPublicUrl(path)
  return Response.json({ url: publicUrl })
}
