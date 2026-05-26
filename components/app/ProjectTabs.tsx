'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Receipt, Layers, Camera, Share2, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Cost, CostCategory, Project, ProjectStage, BudowaMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CostList from './CostList'
import StagesBar from './StagesBar'
import StagesTab from './tabs/StagesTab'
import ReceiptsTab from './tabs/ReceiptsTab'

type Tab = 'costs' | 'stages' | 'receipts' | 'sharing'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'costs',    label: 'Koszty',    icon: Receipt },
  { id: 'stages',   label: 'Etapy',     icon: Layers  },
  { id: 'receipts', label: 'Paragony',  icon: Camera  },
  { id: 'sharing',  label: 'Udostępnij', icon: Share2  },
]

type Props = {
  project: Project
  isOwner: boolean
  costs: Cost[]
  categories: CostCategory[]
  stages: ProjectStage[]
  members: BudowaMember[]
}

function UdostepnijTab({
  projectId,
  isOwner,
  members,
  onMembersChange,
}: {
  projectId: string
  isOwner: boolean
  members: BudowaMember[]
  onMembersChange: (m: BudowaMember[]) => void
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function invite() {
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invited_email: email.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(res.status === 409 ? 'Ten email już ma dostęp' : (body.error ?? 'Błąd'))
        return
      }
      onMembersChange([...members, await res.json()])
      setEmail('')
      toast.success('Użytkownik zaproszony')
    } catch {
      toast.error('Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Błąd usuwania'); return }
      onMembersChange(members.filter(m => m.id !== id))
      toast.success('Usunięto dostęp')
    } catch {
      toast.error('Błąd połączenia')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        Zaproszeni użytkownicy mogą przeglądać i edytować koszty tej budowy.
      </p>

      {members.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}
        >
          {members.map((m, i) => (
            <div key={m.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex items-center justify-center rounded-full text-xs font-semibold shrink-0"
                  style={{ width: 32, height: 32, background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
                >
                  {m.invited_email[0].toUpperCase()}
                </div>
                <p className="flex-1 text-sm truncate" style={{ color: 'var(--color-foreground)' }}>{m.invited_email}</p>
                {isOwner && (
                  <button
                    onClick={() => remove(m.id)}
                    className="flex items-center justify-center rounded-md"
                    style={{ width: 28, height: 28, color: 'var(--color-muted)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {i < members.length - 1 && (
                <div style={{ height: '0.5px', background: 'var(--color-border)', marginLeft: 60 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <div
          className="rounded-2xl px-4 py-8 text-center"
          style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Nikt jeszcze nie ma dostępu</p>
        </div>
      )}

      {isOwner && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && invite()}
            className="flex-1"
          />
          <Button onClick={invite} disabled={loading || !email.trim()} size="sm">
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            {loading ? 'Wysyłam…' : 'Zaproś'}
          </Button>
        </div>
      )}
    </div>
  )
}

function ProjectTabsInner({
  project,
  isOwner,
  costs: initialCosts,
  categories: initialCategories,
  stages: initialStages,
  members: initialMembers,
}: Props) {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'costs'
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some(t => t.id === initialTab) ? initialTab : 'costs'
  )
  const [costs, setCosts] = useState(initialCosts)
  const [categories] = useState(initialCategories)
  const [stages, setStages] = useState(initialStages)
  const [members, setMembers] = useState(initialMembers)

  return (
    <div className="space-y-4">
      {/* Tab bar — iOS segment style */}
      <div
        className="flex -mx-4 px-4 overflow-x-auto"
        style={{ scrollbarWidth: 'none', borderBottom: '0.5px solid var(--color-border)' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'costs' && (
        <>
          <StagesBar costs={costs} stages={stages} />
          <CostList
            costs={costs}
            onCostsChange={setCosts}
            projectId={project.id}
            categories={categories}
            stages={stages}
            isOwner={isOwner}
          />
        </>
      )}
      {activeTab === 'stages' && (
        <StagesTab
          projectId={project.id}
          stages={stages}
          costs={costs}
          onStagesChange={setStages}
        />
      )}
      {activeTab === 'receipts' && (
        <ReceiptsTab costs={costs} />
      )}
      {activeTab === 'sharing' && (
        <UdostepnijTab
          projectId={project.id}
          isOwner={isOwner}
          members={members}
          onMembersChange={setMembers}
        />
      )}
    </div>
  )
}

export default function ProjectTabs(props: Props) {
  return (
    <Suspense>
      <ProjectTabsInner {...props} />
    </Suspense>
  )
}
