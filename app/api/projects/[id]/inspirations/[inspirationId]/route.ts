import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'
import { INSPIRATION_ROOMS } from '@/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; inspirationId: string }> }
) {
  const { id, inspirationId } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const body = await request.json()
  const patch: Record<string, unknown> = {}
  if (body.notes !== undefined) patch.notes = body.notes?.trim() || null
  if (body.room !== undefined) {
    if (!INSPIRATION_ROOMS.includes(body.room)) return Response.json({ error: 'Nieprawidłowy pokój' }, { status: 400 })
    patch.room = body.room
  }
  if (body.title !== undefined) patch.title = body.title?.trim() || null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inspirations')
    .update(patch)
    .eq('id', inspirationId)
    .eq('project_id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inspirationId: string }> }
) {
  const { id, inspirationId } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const { error } = await admin
    .from('inspirations')
    .delete()
    .eq('id', inspirationId)
    .eq('project_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
