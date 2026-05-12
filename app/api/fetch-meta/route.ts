import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return Response.json({ error: 'URL wymagany' }, { status: 400 })

  let finalUrl = url
  let title: string | null = null
  let thumbnail: string | null = null

  try {
    // TikTok oEmbed (follows redirects for short links)
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
      const oembed = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { redirect: 'follow', signal: AbortSignal.timeout(5000) }
      )
      if (oembed.ok) {
        const data = await oembed.json()
        title = data.title ?? null
        thumbnail = data.thumbnail_url ?? null
        return Response.json({ title, thumbnail_url: thumbnail, url: finalUrl })
      }
    }

    // YouTube oEmbed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (oembed.ok) {
        const data = await oembed.json()
        title = data.title ?? null
        thumbnail = data.thumbnail_url ?? null
        return Response.json({ title, thumbnail_url: thumbnail, url: finalUrl })
      }
    }

    // OG tags fallback (follow redirects to resolve short links)
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BudowaKosztyBot/1.0)' },
    })
    finalUrl = res.url // after redirects

    const html = await res.text()

    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)

    title = ogTitle?.[1] ?? titleTag?.[1] ?? null
    thumbnail = ogImage?.[1] ?? null

    // sanitize — strip HTML entities
    if (title) title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

  } catch {
    // timeout or network error — return empty metadata, caller saves url only
  }

  return Response.json({ title, thumbnail_url: thumbnail, url: finalUrl })
}
