import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import type { Cost } from '@/types'
import ProjectHeader from '@/components/app/ProjectHeader'
import ProjectTabs from '@/components/app/ProjectTabs'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await admin
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const isOwner = project.user_id === user.id

  if (!isOwner) {
    const { data: membership } = await admin
      .from('budowa_members')
      .select('id')
      .eq('project_id', id)
      .eq('invited_email', user.email ?? '')
      .maybeSingle()
    if (!membership) notFound()
  }

  const [
    { data: costs },
    { data: categories },
    { data: stages },
    { data: members },
  ] = await Promise.all([
    admin
      .from('costs')
      .select('*, cost_categories(id, name, color), project_stages(id, name, color, sort_order)')
      .eq('project_id', id)
      .order('date', { ascending: false }),
    admin
      .from('cost_categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('name'),
    admin
      .from('project_stages')
      .select('*')
      .eq('project_id', id)
      .order('sort_order'),
    isOwner
      ? admin.from('budowa_members').select('*').eq('project_id', id).order('created_at')
      : Promise.resolve({ data: [] }),
  ])

  const total = (costs ?? []).reduce((sum: number, c: Cost) => sum + Number(c.amount), 0)

  return (
    <div className="space-y-4">
      <ProjectHeader project={project} total={total} isOwner={isOwner} />
      <ProjectTabs
        projectId={id}
        isOwner={isOwner}
        costs={costs ?? []}
        categories={categories ?? []}
        stages={stages ?? []}
        members={members ?? []}
      />
    </div>
  )
}
