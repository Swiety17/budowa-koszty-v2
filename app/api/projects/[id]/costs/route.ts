import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const body = await request.json()
  const { name, amount, date, vendor, notes, category_id, stage_id, receipt_url } = body
  if (!name || !date || isNaN(Number(amount)))
    return Response.json({ error: 'Invalid input' }, { status: 400 })

  // Upsert vendor before cost so the operation is always atomic in the right order
  if (vendor?.trim()) {
    await admin.from('vendors').insert({ user_id: auth.user.id, name: vendor.trim() })
    // ignore error — unique constraint violation means vendor already exists
  }

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
      receipt_url: receipt_url || null,
    })
    .select('*, cost_categories(id, name, color), project_stages(id, name, color, sort_order)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
