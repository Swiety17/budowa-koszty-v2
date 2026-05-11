import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectLoading() {
  return (
    <div className="space-y-6">
      {/* Back + header */}
      <Skeleton className="h-4 w-24" />
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      {/* Stages bar */}
      <div className="rounded-xl border border-border p-4 space-y-4">
        <Skeleton className="h-6 w-full rounded-lg" />
        <div className="flex gap-5">
          {[80, 60, 100].map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full mt-1 shrink-0" />
              <div className="space-y-1">
                <Skeleton className={`h-4 w-${w > 90 ? '24' : w > 70 ? '20' : '16'}`} />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
