import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AuthResult =
  | { user: { id: string; email?: string }; isOwner: boolean; error?: never }
  | { error: Response; user?: never; isOwner?: never }

export async function authorizeProject(projectId: string, requireOwner = false): Promise<AuthResult> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: project } = await admin
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: Response.json({ error: 'Not found' }, { status: 404 }) }

  const isOwner = project.user_id === user.id

  if (requireOwner && !isOwner)
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }

  if (!isOwner) {
    // Prefer user_id match (tamper-proof), fall back to email for first access
    const { data: byUserId } = await admin
      .from('budowa_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (byUserId) return { user, isOwner }

    const { data: byEmail } = await admin
      .from('budowa_members')
      .select('id, user_id')
      .eq('project_id', projectId)
      .eq('invited_email', user.email ?? '')
      .maybeSingle()

    if (!byEmail) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }

    // Bind user_id on first authenticated access
    if (!byEmail.user_id) {
      await admin.from('budowa_members').update({ user_id: user.id }).eq('id', byEmail.id)
    }
  }

  return { user, isOwner }
}
