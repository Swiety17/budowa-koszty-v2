import { formatCurrency } from '@/lib/format'

export default function BudgetBar({
  spent,
  budget,
  label,
}: {
  spent: number
  budget: number
  label?: string
}) {
  const pct = Math.min((spent / budget) * 100, 100)
  const over = spent > budget
  const barColor = pct < 75 ? 'var(--color-success)' : pct < 95 ? 'var(--color-warning)' : 'var(--color-danger)'
  const remaining = budget - spent

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs text-muted-foreground font-medium">{label}</p>}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full motion-safe:transition-all motion-safe:duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Wydano <span className="font-medium text-foreground">{formatCurrency(spent)}</span>
          {' '}/ {formatCurrency(budget)}
        </span>
        {over ? (
          <span className="font-medium text-destructive">
            +{formatCurrency(spent - budget)} ponad budżet
          </span>
        ) : (
          <span>Pozostało <span className="font-medium text-foreground">{formatCurrency(remaining)}</span></span>
        )}
      </div>
    </div>
  )
}
