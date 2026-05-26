import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, House } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import ProjectCard from '@/components/app/ProjectCard'
import type { Project } from '@/types'

type ProjectWithCosts = Project & { costs: { amount: number }[]; project_stages: { id: string }[] }

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: ownProjects }, { data: sharedProjectsRaw }] = await Promise.all([
    admin
      .from('projects')
      .select('*, costs(amount), project_stages(id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('projects')
      .select('*, costs(amount), project_stages(id), budowa_members!inner(project_id)')
      .eq('budowa_members.invited_email', user.email ?? '')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const sharedProjects = (sharedProjectsRaw ?? []) as ProjectWithCosts[]
  const sharedIds = new Set(sharedProjects.map(p => p.id))

  const allProjects = [
    ...(ownProjects ?? []) as ProjectWithCosts[],
    ...sharedProjects,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totals: Record<string, number> = {}
  for (const p of allProjects) {
    totals[p.id] = (p.costs ?? []).reduce((s, c) => s + Number(c.amount), 0)
  }

  const grandTotal = (ownProjects ?? [] as ProjectWithCosts[]).reduce(
    (s, p) => s + (totals[p.id] ?? 0),
    0
  )

  const totalCosts = allProjects.reduce((s, p) => s + (p.costs?.length ?? 0), 0)

  return (
    <div className="space-y-0 -mx-4 -mt-4 md:mx-0 md:mt-0">
      {/* iOS-style large title nav bar */}
      <div
        className="sticky top-0 z-20 md:static"
        style={{ background: 'var(--color-nav-bg)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderBottom: '0.5px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 30, height: 30, background: 'linear-gradient(145deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)' }}
            >
              <House className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
          </div>
          <Link href="/projects/new" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            <Plus className="h-5 w-5" strokeWidth={2.2} />
            Nowa
          </Link>
        </div>
        <div className="px-4 pb-3 pt-0.5">
          <h1
            className="text-[34px] font-bold leading-tight"
            style={{ color: 'var(--color-foreground)', letterSpacing: '-0.025em' }}
          >
            Budowy
          </h1>
        </div>
      </div>

      <div className="px-4 md:px-0 md:pt-4 space-y-4 mt-4">

        {/* Summary card — teal gradient */}
        {allProjects.length > 0 && (
          <div
            className="rounded-2xl px-4 py-4"
            style={{
              background: 'linear-gradient(140deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
              boxShadow: '0 4px 20px rgba(44,165,147,0.28)',
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.01em' }}>
              Łączne wydatki
            </p>
            <p
              className="text-[32px] font-extrabold"
              style={{ color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              {formatCurrency(grandTotal)}
            </p>
            <div
              className="flex gap-4 mt-3 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}
            >
              {[
                { v: allProjects.length, l: 'projektów' },
                { v: totalCosts, l: 'kosztów' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-xl font-bold" style={{ color: '#fff' }}>{s.v}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {allProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div
              className="rounded-full p-4"
              style={{ background: 'var(--color-surface3)' }}
            >
              <House className="h-8 w-8" style={{ color: 'var(--color-muted)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--color-foreground)' }}>Brak budów</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
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

        {/* Section label */}
        {allProjects.length > 0 && (
          <p
            className="text-xs font-medium uppercase px-4 md:px-0"
            style={{ color: 'var(--color-muted)', letterSpacing: '0.03em' }}
          >
            Moje projekty
          </p>
        )}

        {/* Project list — iOS inset group */}
        {allProjects.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden md:border md:rounded-xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {allProjects.map((project, i) => (
              <div key={project.id}>
                <div className="animate-fade-up" style={{ animationDelay: `${i * 65}ms` }}>
                  <ProjectCard
                    id={project.id}
                    name={project.name}
                    address={project.address}
                    budget={project.budget}
                    total={totals[project.id] ?? 0}
                    isShared={sharedIds.has(project.id)}
                    costCount={project.costs?.length ?? 0}
                    stageCount={project.project_stages?.length ?? 0}
                  />
                </div>
                {i < allProjects.length - 1 && (
                  <div style={{ height: '0.5px', background: 'var(--color-border)', marginLeft: 16 }} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
