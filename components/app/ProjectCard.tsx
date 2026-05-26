import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

type Props = {
  id: string
  name: string
  address?: string | null
  budget?: number | null
  total: number
  isShared?: boolean
  costCount?: number
  stageCount?: number
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = Math.min((spent / budget) * 100, 100)
  const color =
    pct < 75  ? 'var(--color-success)'
    : pct < 95 ? 'var(--color-warning)'
    :             'var(--color-danger)'
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ height: 5, background: 'var(--color-surface3)' }}
    >
      <div
        className="h-full rounded-full motion-safe:transition-all motion-safe:duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export default function ProjectCard({ id, name, address, budget, total, isShared, costCount, stageCount }: Props) {
  const pct = budget ? Math.min(Math.round((total / budget) * 100), 100) : null
  const budgetColor =
    pct === null ? null
    : pct < 75   ? 'var(--color-success)'
    : pct < 95   ? 'var(--color-warning)'
    :               'var(--color-danger)'

  return (
    <Link
      href={`/projects/${id}`}
      aria-label={`${name} — ${formatCurrency(total)}`}
      className="block"
    >
      <div
        className="px-4 py-3.5 motion-safe:active:opacity-60 transition-opacity"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Name + badge */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p
            className="font-semibold leading-snug line-clamp-2 text-base"
            style={{ color: 'var(--color-foreground)', letterSpacing: '-0.015em' }}
          >
            {name}
          </p>
          {isShared && (
            <Badge
              variant="secondary"
              className="shrink-0 text-[11px] px-2 py-0 rounded-full"
              style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)', border: 'none' }}
            >
              Wspólny
            </Badge>
          )}
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-center gap-1 mb-3.5" style={{ color: 'var(--color-muted)' }}>
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="text-xs truncate">{address}</span>
          </div>
        )}

        {/* Budget bar */}
        {budget && <div className={address ? '' : 'mt-3'}><BudgetBar spent={total} budget={budget} /></div>}

        {/* Amounts row */}
        <div className="flex justify-between items-baseline mt-2 mb-3">
          <div>
            <span
              className="text-[15px] font-semibold"
              style={{ color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}
            >
              {formatCurrency(total)}
            </span>
            {budget && (
              <span className="text-xs ml-1.5" style={{ color: 'var(--color-muted)' }}>
                z {formatCurrency(budget)}
              </span>
            )}
          </div>
          {pct !== null && (
            <span className="text-sm font-bold" style={{ color: budgetColor ?? undefined }}>
              {pct}%
            </span>
          )}
        </div>

        {/* Stats footer */}
        {(costCount !== undefined || stageCount !== undefined) && (
          <div
            className="flex items-center gap-1.5 pt-2.5"
            style={{ borderTop: '0.5px solid var(--color-border)' }}
          >
            {costCount !== undefined && (
              <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                {costCount} kosztów
              </span>
            )}
            {costCount !== undefined && stageCount !== undefined && (
              <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>·</span>
            )}
            {stageCount !== undefined && (
              <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                {stageCount} etapów
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
