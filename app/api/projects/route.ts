import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: owned }, { data: memberRows }] = await Promise.all([
    admin.from('projects').select('*').eq('user_id', user.id).order('created_at'),
    admin.from('budowa_members').select('project_id').eq('invited_email', user.email ?? ''),
  ])

  const memberIds = (memberRows ?? []).map(r => r.project_id)
  const memberProjects = memberIds.length > 0
    ? (await admin.from('projects').select('*').in('id', memberIds)).data ?? []
    : []

  const all = [...(owned ?? []), ...memberProjects]
  return Response.json(all)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, address, budget, description } = body
  if (!name?.trim()) return Response.json({ error: 'Nazwa jest wymagana' }, { status: 400 })

  const id = crypto.randomUUID()
  const { data, error } = await admin
    .from('projects')
    .insert({
      id,
      user_id: user.id,
      name: name.trim(),
      address: address?.trim() || null,
      budget: budget ?? null,
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
