import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const body = await request.json()
  const { name, amount, date, vendor, notes, category_id, stage_id, receipt_url } = body
  const amountNum = Number(amount)
  if (!name || !date || !Number.isFinite(amountNum) || amountNum <= 0)
    return Response.json({ error: 'Invalid input' }, { status: 400 })

  // Validate receipt_url belongs to this project
  if (receipt_url) {
    try {
      const marker = '/storage/v1/object/public/receipts/'
      const idx = receipt_url.indexOf(marker)
      const path = idx !== -1 ? decodeURIComponent(receipt_url.slice(idx + marker.length)) : null
      if (!path || !path.startsWith(`${id}/`))
        return Response.json({ error: 'Nieprawidłowy URL paragonu' }, { status: 400 })
    } catch {
      return Response.json({ error: 'Nieprawidłowy URL paragonu' }, { status: 400 })
    }
  }

  // Validate category_id belongs to this user (or is a global built-in)
  if (category_id) {
    const { data: cat } = await admin.from('cost_categories').select('user_id').eq('id', category_id).maybeSingle()
    if (!cat || (cat.user_id !== null && cat.user_id !== auth.user.id))
      return Response.json({ error: 'Nieprawidłowa kategoria' }, { status: 400 })
  }

  // Validate stage_id belongs to this project
  if (stage_id) {
    const { data: stage } = await admin.from('project_stages').select('project_id').eq('id', stage_id).maybeSingle()
    if (!stage || stage.project_id !== id)
      return Response.json({ error: 'Nieprawidłowy etap' }, { status: 400 })
  }

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
      amount: amountNum,
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
