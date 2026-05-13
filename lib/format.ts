export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Converts Supabase Storage object URL to an image transformation URL
export function toReceiptThumbnail(url: string, width = 800, quality = 80): string {
  if (!url.includes('/storage/v1/object/')) return url
  return url.replace('/storage/v1/object/', '/storage/v1/render/image/') +
    `?width=${width}&quality=${quality}`
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}
