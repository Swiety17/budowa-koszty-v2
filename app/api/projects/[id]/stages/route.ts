import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('project_stages')
    .select('*')
    .eq('project_id', id)
    .order('sort_order')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id, true)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const body = await request.json()
  if (!body.name?.trim()) return Response.json({ error: 'Nazwa jest wymagana' }, { status: 400 })

  const { data: existing } = await admin
    .from('project_stages')
    .select('sort_order')
    .eq('project_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await admin
    .from('project_stages')
    .insert({ project_id: id, name: body.name.trim(), color: body.color ?? '#6b7280', sort_order: nextOrder })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
