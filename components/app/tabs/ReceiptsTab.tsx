'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import type { Cost } from '@/types'
import { formatCurrency, formatDate, toReceiptThumbnail } from '@/lib/format'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function ReceiptsTab({ costs }: { costs: Cost[] }) {
  const withReceipts = costs.filter(c => c.receipt_url)
  const [lightbox, setLightbox] = useState<Cost | null>(null)

  if (withReceipts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Brak paragonów</p>
          <p className="text-sm text-muted-foreground mt-1">
            Dodaj zdjęcie paragonu przy tworzeniu lub edycji kosztu
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {withReceipts.map(cost => (
          <button
            key={cost.id}
            onClick={() => setLightbox(cost)}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted hover:border-foreground/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <Image
              src={toReceiptThumbnail(cost.receipt_url!)}
              alt={cost.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
              <p className="text-xs font-semibold text-white leading-snug line-clamp-1">{cost.name}</p>
              <p className="text-xs text-white/70 tabular-nums">{formatCurrency(Number(cost.amount))}</p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!lightbox} onOpenChange={open => { if (!open) setLightbox(null) }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">{lightbox?.name}</DialogTitle>
          </DialogHeader>
          {lightbox?.receipt_url && (
            <div className="relative w-full max-h-[70dvh] min-h-[300px] bg-muted">
              <Image
                src={toReceiptThumbnail(lightbox.receipt_url, 1200, 90)}
                alt={lightbox.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 512px"
              />
            </div>
          )}
          {lightbox && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
              <span>{formatDate(lightbox.date)}</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--color-amount)' }}>
                {formatCurrency(Number(lightbox.amount))}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
