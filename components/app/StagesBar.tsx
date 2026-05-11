'use client'
import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Cost, ProjectStage } from '@/types'
import { formatCurrency } from '@/lib/format'

type Row = {
  key: string
  stage: ProjectStage | null
  total: number
  count: number
  pct: number
}

export default function StagesBar({ costs, stages }: { costs: Cost[]; stages: ProjectStage[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeEtap = searchParams.get('etap') ?? ''

  const rows = useMemo<Row[]>(() => {
    const grand = costs.reduce((s, c) => s + Number(c.amount), 0)
    const result: Row[] = stages.map(stage => {
      const sc = costs.filter(c => c.stage_id === stage.id)
      const total = sc.reduce((s, c) => s + Number(c.amount), 0)
      return {
        key: stage.id,
        stage,
        total,
        count: sc.length,
        pct: grand > 0 ? (total / grand) * 100 : 0,
      }
    })
    const unassigned = costs.filter(c => !c.stage_id)
    if (unassigned.length > 0) {
      const total = unassigned.reduce((s, c) => s + Number(c.amount), 0)
      result.push({
        key: 'unassigned',
        stage: null,
        total,
        count: unassigned.length,
        pct: grand > 0 ? (total / grand) * 100 : 0,
      })
    }
    return result
  }, [costs, stages])

  if (stages.length === 0) return null

  function toggle(filterId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (activeEtap === filterId) params.delete('etap')
    else params.set('etap', filterId)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Etapy budowy
      </p>

      {/* Stacked bar */}
      <div className="flex h-6 rounded-lg overflow-hidden gap-px">
        {rows.map(row => {
          if (row.pct === 0) return null
          const filterId = row.stage ? row.stage.id : '__unassigned__'
          const isActive = activeEtap === filterId
          const color = row.stage?.color ?? '#9ca3af'
          return (
            <button
              key={row.key}
              onClick={() => toggle(filterId)}
              title={`${row.stage?.name ?? 'Nieprzypisane'}: ${formatCurrency(row.total)}`}
              style={{
                width: `${row.pct}%`,
                backgroundColor: color,
                opacity: activeEtap && !isActive ? 0.3 : 1,
                minWidth: 4,
              }}
              className="transition-opacity hover:opacity-80 focus:outline-none"
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {rows.map(row => {
          const filterId = row.stage ? row.stage.id : '__unassigned__'
          const isActive = activeEtap === filterId
          const color = row.stage?.color ?? '#9ca3af'
          return (
            <button
              key={row.key}
              onClick={() => toggle(filterId)}
              className="flex items-start gap-2 text-left min-w-0 group"
              style={{ opacity: activeEtap && !isActive ? 0.4 : 1 }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0 mt-1 transition-transform group-hover:scale-125"
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-sm font-medium leading-snug">
                  {row.stage?.name ?? (
                    <span className="italic text-muted-foreground">Nieprzypisane</span>
                  )}
                  {isActive && (
                    <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--color-accent)' }}>
                      · aktywny
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(row.total)} · {row.count} poz · {row.pct.toFixed(1)}%
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
