import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

function extractReceiptPath(url: string): string | null {
  const marker = '/storage/v1/object/public/receipts/'
  const idx = url.indexOf(marker)
  return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
}


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; costId: string }> },
) {
  const { id, costId } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()
  const body = await request.json()
  const { name, amount, date, vendor, notes, category_id, stage_id, receipt_url } = body
  const amountNum = Number(amount)
  if (!name || !date || !Number.isFinite(amountNum) || amountNum <= 0)
    return Response.json({ error: 'Invalid input' }, { status: 400 })

  // Prevent cross-project receipt URL injection
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

  // Fetch old receipt_url before overwriting — needed for storage cleanup
  const receiptChanging = 'receipt_url' in body
  let oldReceiptUrl: string | null = null
  if (receiptChanging) {
    const { data: current } = await admin.from('costs').select('receipt_url').eq('id', costId).eq('project_id', id).single()
    oldReceiptUrl = current?.receipt_url ?? null
  }

  // Upsert vendor before updating cost
  if (vendor?.trim()) {
    await admin.from('vendors').insert({ user_id: auth.user.id, name: vendor.trim() })
    // ignore error — unique constraint = already exists
  }

  const update: Record<string, unknown> = {
    name,
    amount: amountNum,
    date,
    vendor: vendor || null,
    notes: notes || null,
    category_id: category_id || null,
    stage_id: stage_id || null,
  }
  if (receiptChanging) update.receipt_url = receipt_url || null

  const { data, error } = await admin
    .from('costs')
    .update(update)
    .eq('id', costId)
    .eq('project_id', id)
    .select('*, cost_categories(id, name, color), project_stages(id, name, color, sort_order)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Delete old blob if receipt changed and old one existed
  if (receiptChanging && oldReceiptUrl && oldReceiptUrl !== (receipt_url || null)) {
    const path = extractReceiptPath(oldReceiptUrl)
    if (path && path.startsWith(`${id}/`))
      await admin.storage.from('receipts').remove([path]).catch(() => {})
  }

  return Response.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; costId: string }> },
) {
  const { id, costId } = await params
  const auth = await authorizeProject(id, true)
  if (auth.error) return auth.error

  const admin = createAdminClient()

  // Clean up storage blob if cost has a receipt
  const { data: cost } = await admin.from('costs').select('receipt_url').eq('id', costId).eq('project_id', id).single()
  if (cost?.receipt_url) {
    const path = extractReceiptPath(cost.receipt_url)
    if (path && path.startsWith(`${id}/`))
      await admin.storage.from('receipts').remove([path]).catch(() => {})
  }

  const { error } = await admin.from('costs').delete().eq('id', costId).eq('project_id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
