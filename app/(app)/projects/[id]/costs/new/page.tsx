import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AddCostForm from '@/components/app/AddCostForm'

export default async function NewCostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: project } = await admin
    .from('projects')
    .select('id, name, user_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  if (project.user_id !== user.id) {
    const { data: membership } = await admin
      .from('budowa_members')
      .select('id')
      .eq('project_id', id)
      .eq('invited_email', user.email ?? '')
      .maybeSingle()
    if (!membership) notFound()
  }

  const [{ data: categories }, { data: stages }] = await Promise.all([
    admin
      .from('cost_categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('name'),
    admin.from('project_stages').select('*').eq('project_id', id).order('sort_order'),
  ])

  return (
    <AddCostForm
      projectId={id}
      projectName={project.name}
      categories={categories ?? []}
      stages={stages ?? []}
    />
  )
}
