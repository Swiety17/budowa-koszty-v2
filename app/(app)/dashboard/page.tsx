import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import ProjectCard from '@/components/app/ProjectCard'
import type { Project } from '@/types'

type ProjectWithCosts = Project & { costs: { amount: number }[] }

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: memberRows }, { data: ownProjects }] = await Promise.all([
    admin
      .from('budowa_members')
      .select('project_id')
      .eq('invited_email', user.email ?? ''),
    admin
      .from('projects')
      .select('*, costs(amount)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const sharedIds = new Set((memberRows ?? []).map((r: { project_id: string }) => r.project_id))

  const { data: sharedProjects } = sharedIds.size
    ? await admin
        .from('projects')
        .select('*, costs(amount)')
        .in('id', [...sharedIds])
        .order('created_at', { ascending: false })
    : { data: [] }

  const allProjects = [
    ...(ownProjects ?? []) as ProjectWithCosts[],
    ...(sharedProjects ?? []) as ProjectWithCosts[],
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totals: Record<string, number> = {}
  for (const p of allProjects) {
    totals[p.id] = (p.costs ?? []).reduce((s, c) => s + Number(c.amount), 0)
  }

  const grandTotal = (ownProjects ?? [] as ProjectWithCosts[]).reduce(
    (s, p) => s + (totals[p.id] ?? 0),
    0
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Moje budowy</h1>
          <p className="text-sm text-muted-foreground">
            Łączne koszty: {formatCurrency(grandTotal)}
          </p>
        </div>
        <Link href="/projects/new" className="hidden md:block">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nowa budowa
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {allProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Brak budów</p>
            <p className="text-sm text-muted-foreground mt-1">
              Stwórz pierwszą budowę lub poproś o zaproszenie
            </p>
          </div>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Utwórz budowę
            </Button>
          </Link>
        </div>
      )}

      {/* Grid */}
      {allProjects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allProjects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              address={project.address}
              budget={project.budget}
              total={totals[project.id] ?? 0}
              isShared={sharedIds.has(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
