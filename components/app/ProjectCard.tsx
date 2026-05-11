import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
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
}

export default function ProjectCard({ id, name, address, budget, total, isShared }: Props) {
  const pct = budget ? Math.min((total / budget) * 100, 100) : null
  const barColor =
    pct === null ? null
    : pct < 75  ? 'var(--color-success)'
    : pct < 95  ? 'var(--color-warning)'
    :              'var(--color-danger)'

  return (
    <Link
      href={`/projects/${id}`}
      aria-label={`${name} — ${formatCurrency(total)}`}
      className="block group"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md active:scale-[0.98] transition-transform">
        <CardContent className="p-4 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug line-clamp-2">{name}</p>
            {isShared && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Udostępniona
              </Badge>
            )}
          </div>

          {/* Address */}
          {address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {address}
            </p>
          )}

          {/* Total */}
          <p className="text-2xl font-bold" style={{ color: 'var(--color-amount)' }}>
            {formatCurrency(total)}
          </p>

          {/* Budget bar */}
          {budget && pct !== null && (
            <div className="space-y-1 pt-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: barColor ?? undefined }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(pct)}% z {formatCurrency(budget)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
