import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeProject } from '@/lib/authorizeProject'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorizeProject(id)
  if (auth.error) return auth.error

  const admin = createAdminClient()

  const [{ data: ownVendors }, { data: projectCosts }] = await Promise.all([
    admin.from('vendors').select('name').eq('user_id', auth.user.id).order('name'),
    admin.from('costs').select('vendor').eq('project_id', id).not('vendor', 'is', null),
  ])

  const names = new Set<string>()
  for (const v of ownVendors ?? []) names.add(v.name)
  for (const c of projectCosts ?? []) if (c.vendor) names.add(c.vendor)

  return Response.json([...names].sort((a, b) => a.localeCompare(b, 'pl')))
}
