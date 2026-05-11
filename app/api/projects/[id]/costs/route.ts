import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function authorize(userId: string, projectId: string, admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from('projects').select('user_id').eq('id', projectId).single()
  return !!data && data.user_id === userId
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await authorize(user.id, id, admin))
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, amount, date, vendor, notes, category_id, stage_id } = body
  if (!name || !date || isNaN(Number(amount)))
    return Response.json({ error: 'Invalid input' }, { status: 400 })

  const { data, error } = await admin
    .from('costs')
    .insert({
      id: crypto.randomUUID(),
      project_id: id,
      name,
      amount: Number(amount),
      date,
      vendor: vendor || null,
      notes: notes || null,
      category_id: category_id || null,
      stage_id: stage_id || null,
    })
    .select('*, cost_categories(id, name, color), project_stages(id, name, color, sort_order)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
