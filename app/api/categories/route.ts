import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('cost_categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color } = await request.json()
  if (!name?.trim() || !color) return Response.json({ error: 'Nieprawidłowe dane' }, { status: 400 })

  const { data, error } = await admin
    .from('cost_categories')
    .insert({ name: name.trim(), color, user_id: user.id })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
