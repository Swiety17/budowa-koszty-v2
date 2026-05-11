import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Cost } from '@/types'
import ProjectHeader from '@/components/app/ProjectHeader'
import StagesBar from '@/components/app/StagesBar'
import CostList from '@/components/app/CostList'
import { Skeleton } from '@/components/ui/skeleton'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
  ])

  const total = (costs ?? []).reduce((sum: number, c: Cost) => sum + Number(c.amount), 0)

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} total={total} isOwner={isOwner} />
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <StagesBar costs={costs ?? []} stages={stages ?? []} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <CostList
          costs={costs ?? []}
          projectId={id}
          categories={categories ?? []}
          stages={stages ?? []}
          isOwner={isOwner}
        />
      </Suspense>
    </div>
  )
}
