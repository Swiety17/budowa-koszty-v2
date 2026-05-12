import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const auth = await authorizeProject(id, true)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const body = await request.json()
  if (!body.name?.trim()) return Response.json({ error: 'Nazwa jest wymagana' }, { status: 400 })

  const { data, error } = await admin
    .from('project_stages')
    .update({ name: body.name.trim(), color: body.color ?? '#6b7280' })
    .eq('id', stageId)
    .eq('project_id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const auth = await authorizeProject(id, true)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const { error } = await admin
    .from('project_stages')
    .delete()
    .eq('id', stageId)
    .eq('project_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
