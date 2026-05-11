import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await admin.from('projects').select('user_id').eq('id', id).single()
  if (!project || project.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, address, budget, description } = body
  if (!name?.trim()) return Response.json({ error: 'Nazwa jest wymagana' }, { status: 400 })

  const { data, error } = await admin
    .from('projects')
    .update({
      name: name.trim(),
      address: address?.trim() || null,
      budget: budget ?? null,
      description: description?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await admin.from('projects').select('user_id').eq('id', id).single()
  if (!project || project.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin.from('projects').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
