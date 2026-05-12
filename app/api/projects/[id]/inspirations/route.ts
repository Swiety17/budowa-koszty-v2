import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'
import { INSPIRATION_ROOMS } from '@/types'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inspirations')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const body = await request.json()
  const { url, room, title, thumbnail_url, notes } = body

  if (!url?.trim()) return Response.json({ error: 'URL wymagany' }, { status: 400 })
  if (!INSPIRATION_ROOMS.includes(room)) return Response.json({ error: 'Nieprawidłowy pokój' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inspirations')
    .insert({
      id: crypto.randomUUID(),
      project_id: id,
      url: url.trim(),
      room,
      title: title?.trim() || null,
      thumbnail_url: thumbnail_url?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
