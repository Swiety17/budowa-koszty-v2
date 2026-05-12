import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await admin.from('projects').select('user_id').eq('id', id).single()
  if (!project || project.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('budowa_members')
    .select('*')
    .eq('project_id', id)
    .order('created_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await admin.from('projects').select('user_id').eq('id', id).single()
  if (!project || project.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const email = (body.invited_email as string)?.trim().toLowerCase()
  if (!email) return Response.json({ error: 'Email wymagany' }, { status: 400 })
  if (email === user.email) return Response.json({ error: 'Nie możesz zaprosić siebie' }, { status: 400 })

  const { data, error } = await admin
    .from('budowa_members')
    .insert({ project_id: id, invited_email: email })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'duplicate' }, { status: 409 })
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
