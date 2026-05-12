import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cat } = await admin.from('cost_categories').select('user_id').eq('id', id).single()
  if (!cat || cat.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { name, color } = await request.json()
  if (!name?.trim() || !color) return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })

  const { data, error } = await admin
    .from('cost_categories')
    .update({ name: name.trim(), color })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cat } = await admin.from('cost_categories').select('user_id').eq('id', id).single()
  if (!cat || cat.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin.from('cost_categories').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
