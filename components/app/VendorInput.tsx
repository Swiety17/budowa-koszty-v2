'use client'
import { useRef, useState, useEffect, useMemo } from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function VendorInput({
  value,
  onChange,
  suggestions,
  disabled,
  placeholder = 'np. Firma Budowlana XYZ',
  id,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  disabled?: boolean
  placeholder?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return suggestions.slice(0, 8)
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 10)
  }, [value, suggestions])

  const hasExactMatch = suggestions.some(
    s => s.toLowerCase() === value.trim().toLowerCase()
  )
  const showAddNew = value.trim() && !hasExactMatch

  const items = [
    ...filtered,
    ...(showAddNew ? [`__new__:${value.trim()}`] : []),
  ]

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(item: string) {
    if (item.startsWith('__new__:')) {
      onChange(item.slice(8))
    } else {
      onChange(item)
    }
    setOpen(false)
    setHighlighted(-1)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown') { setOpen(true); setHighlighted(0); e.preventDefault() }
      return
    }
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min(h + 1, items.length - 1))
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max(h - 1, 0))
      e.preventDefault()
    } else if (e.key === 'Enter' && highlighted >= 0) {
      select(items[highlighted])
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoCapitalize="words"
        autoComplete="off"
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-[3px] focus:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1) }}
        onFocus={() => { setOpen(true) }}
        onKeyDown={handleKeyDown}
      />

      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          {items.map((item, i) => {
            const isNew = item.startsWith('__new__:')
            const label = isNew ? item.slice(8) : item
            const isSelected = !isNew && label.toLowerCase() === value.trim().toLowerCase()
            return (
              <button
                key={item}
                type="button"
                onMouseDown={e => { e.preventDefault(); select(item) }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  i === highlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                )}
              >
                {isNew ? (
                  <>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      Dodaj nowego: <span className="font-medium">{label}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Check className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                    {label}
                  </>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
