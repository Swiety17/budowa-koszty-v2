'use client'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Search, X, MoreHorizontal, Pencil, Trash2, Receipt } from 'lucide-react'
import type { Cost, CostCategory, ProjectStage } from '@/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import EditCostSheet from './EditCostSheet'

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  const label = new Date(year, month - 1).toLocaleDateString('pl-PL', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function CostList({
  costs,
  onCostsChange,
  projectId,
  categories,
  stages,
}: {
  costs: Cost[]
  onCostsChange: (costs: Cost[]) => void
  projectId: string
  categories: CostCategory[]
  stages: ProjectStage[]
  isOwner: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [editingCost, setEditingCost] = useState<Cost | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const stageId = searchParams.get('etap') ?? ''

  // Vendors with totals, sorted by spending desc
  const vendorTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of costs) {
      if (c.vendor) map.set(c.vendor, (map.get(c.vendor) ?? 0) + Number(c.amount))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [costs])

  const filteredCosts = useMemo(() => {
    return costs.filter(cost => {
      if (search) {
        const q = search.toLowerCase()
        const hit =
          cost.name.toLowerCase().includes(q) ||
          (cost.vendor ?? '').toLowerCase().includes(q) ||
          (cost.notes ?? '').toLowerCase().includes(q)
        if (!hit) return false
      }
      if (categoryId && cost.category_id !== categoryId) return false
      if (vendorFilter && cost.vendor !== vendorFilter) return false
      if (stageId === '__unassigned__') {
        if (cost.stage_id !== null) return false
      } else if (stageId && cost.stage_id !== stageId) return false
      return true
    })
  }, [costs, search, categoryId, vendorFilter, stageId])

  const grouped = useMemo(() => {
    const map = new Map<string, Cost[]>()
    for (const cost of filteredCosts) {
      const key = cost.date.slice(0, 7)
      const arr = map.get(key) ?? []
      arr.push(cost)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredCosts])

  const filteredTotal = filteredCosts.reduce((s, c) => s + Number(c.amount), 0)
  const isFiltered = !!(search || categoryId || vendorFilter || stageId)

  function clearFilters() {
    setSearch('')
    setCategoryId('')
    setVendorFilter('')
    if (stageId) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('etap')
      router.push(`?${params.toString()}`, { scroll: false })
    }
  }

  async function deleteCost() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/costs/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Błąd serwera'); return }
      onCostsChange(costs.filter(c => c.id !== deleteId))
      setDeleteId(null)
      toast.success('Koszt usunięty')
    } finally {
      setDeleting(false)
    }
  }

  const deletingCostName = deleteId ? costs.find(c => c.id === deleteId)?.name : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Koszty</h2>
        <Link href={`/projects/${projectId}/costs/new`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Dodaj koszt
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj kosztów…"
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCategoryId('')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              !categoryId
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground'
            }`}
          >
            Wszystkie
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(prev => prev === cat.id ? '' : cat.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                categoryId === cat.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Vendor pills — sorted by spending */}
      {vendorTotals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setVendorFilter('')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              !vendorFilter
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground'
            }`}
          >
            Wykonawcy
          </button>
          {vendorTotals.map(([vendor, total]) => (
            <button
              key={vendor}
              onClick={() => setVendorFilter(prev => prev === vendor ? '' : vendor)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                vendorFilter === vendor
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground'
              }`}
            >
              {vendor}
              <span className={`tabular-nums ${vendorFilter === vendor ? 'opacity-80' : 'opacity-60'}`}>
                {formatCurrency(total)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Filter summary */}
      {isFiltered && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {filteredCosts.length} z {costs.length} kosztów
            {vendorFilter && <span> · <strong className="text-foreground">{vendorFilter}</strong></span>}
            {stageId && <span> · filtr etapu</span>}
          </p>
          <button
            onClick={clearFilters}
            className="text-xs hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Wyczyść filtry
          </button>
        </div>
      )}

      {/* Empty state — no costs at all */}
      {costs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Brak kosztów</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dodaj pierwszy koszt do tej budowy
            </p>
          </div>
          <Link href={`/projects/${projectId}/costs/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj koszt
            </Button>
          </Link>
        </div>
      )}

      {/* No results */}
      {costs.length > 0 && filteredCosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Brak wyników dla wybranych filtrów</p>
          <button
            onClick={clearFilters}
            className="text-sm mt-1 hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Wyczyść filtry
          </button>
        </div>
      )}

      {/* Grouped cost rows */}
      {grouped.map(([monthKey, monthCosts]) => {
        const monthTotal = monthCosts.reduce((s, c) => s + Number(c.amount), 0)
        return (
          <div key={monthKey} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{monthLabel(monthKey)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(monthTotal)} · {monthCosts.length} poz
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {monthCosts.map(cost => {
                const cat = cost.cost_categories
                return (
                  <div key={cost.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Category color dot */}
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color ?? '#9ca3af' }}
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">{cost.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(cost.date)}
                        {cost.vendor && ` · ${cost.vendor}`}
                        {cat && ` · ${cat.name}`}
                      </p>
                    </div>
                    {/* Amount */}
                    <p
                      className="text-sm font-semibold shrink-0 tabular-nums"
                      style={{ color: 'var(--color-amount)' }}
                    >
                      {formatCurrency(Number(cost.amount))}
                    </p>
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus:outline-none -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Akcje</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCost(cost)}>
                          <Pencil className="h-4 w-4" />
                          Edytuj
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Total footer */}
      {filteredCosts.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {isFiltered ? 'Suma filtrowanych' : 'Łącznie'}
          </p>
          <p className="font-semibold tabular-nums" style={{ color: 'var(--color-amount)' }}>
            {formatCurrency(filteredTotal)}
          </p>
        </div>
      )}

      {/* Edit Sheet */}
      <EditCostSheet
        cost={editingCost}
        projectId={projectId}
        open={!!editingCost}
        onOpenChange={open => { if (!open) setEditingCost(null) }}
        categories={categories}
        stages={stages}
        onUpdated={updated => {
          onCostsChange(costs.map(c => c.id === updated.id ? updated : c))
        }}
      />

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Usuń koszt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deletingCostName && (
              <>Czy na pewno chcesz usunąć <strong>"{deletingCostName}"</strong>? Tej operacji nie można cofnąć.</>
            )}
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button variant="destructive" onClick={deleteCost} disabled={deleting}>
              {deleting ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
