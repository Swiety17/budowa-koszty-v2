'use client'
import { useState } from 'react'
import { Receipt, Layers, Camera, Settings } from 'lucide-react'
import type { Cost, CostCategory, ProjectStage, BudowaMember } from '@/types'
import CostList from './CostList'
import StagesBar from './StagesBar'
import StagesTab from './tabs/StagesTab'
import ReceiptsTab from './tabs/ReceiptsTab'
import SettingsTab from './tabs/SettingsTab'

type Tab = 'costs' | 'stages' | 'receipts' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'costs',    label: 'Koszty',     icon: Receipt  },
  { id: 'stages',   label: 'Etapy',      icon: Layers   },
  { id: 'receipts', label: 'Paragony',   icon: Camera   },
  { id: 'settings', label: 'Ustawienia', icon: Settings },
]

export default function ProjectTabs({
  projectId,
  isOwner,
  costs: initialCosts,
  categories: initialCategories,
  stages: initialStages,
  members: initialMembers,
}: {
  projectId: string
  isOwner: boolean
  costs: Cost[]
  categories: CostCategory[]
  stages: ProjectStage[]
  members: BudowaMember[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('costs')
  const [costs, setCosts] = useState(initialCosts)
  const [categories, setCategories] = useState(initialCategories)
  const [stages, setStages] = useState(initialStages)
  const [members, setMembers] = useState(initialMembers)

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div
        className="flex border-b border-border -mx-4 px-4 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
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
            projectId={projectId}
            categories={categories}
            stages={stages}
            isOwner={isOwner}
          />
        </>
      )}
      {activeTab === 'stages' && (
        <StagesTab
          projectId={projectId}
          stages={stages}
          onStagesChange={setStages}
        />
      )}
      {activeTab === 'receipts' && (
        <ReceiptsTab costs={costs} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab
          projectId={projectId}
          isOwner={isOwner}
          categories={categories}
          onCategoriesChange={setCategories}
          members={members}
          onMembersChange={setMembers}
        />
      )}
    </div>
  )
}
