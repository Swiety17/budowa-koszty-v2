import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await admin.from('projects').select('user_id').eq('id', id).single()
  if (!project || project.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin
    .from('budowa_members')
    .delete()
    .eq('id', memberId)
    .eq('project_id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
