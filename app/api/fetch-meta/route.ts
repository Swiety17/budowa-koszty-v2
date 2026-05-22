import { createClient } from '@/lib/supabase/server'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import https from 'node:https'
import http from 'node:http'
import type { IncomingMessage } from 'node:http'

// Blocks loopback, link-local (AWS metadata 169.254.x.x), RFC-1918 private ranges
const PRIVATE_IP_RE =
  /^(127\.|0\.0\.0\.0|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe80:)/i

async function resolveAndValidate(host: string): Promise<string> {
  const address = isIP(host) ? host : (await lookup(host, { family: 4 })).address
  if (PRIVATE_IP_RE.test(address)) throw new Error('blocked-ip')
  return address
}

// Connects to the already-validated IP directly — prevents DNS rebinding re-resolution.
// `host` = original hostname (for Host header + TLS SNI), `address` = validated IPv4.
function ipFetch(
  urlStr: string,
  address: string,
  opts: { timeoutMs?: number; maxBytes?: number } = {}
): Promise<{ text: string; status: number; location: string | null; finalUrl: string }> {
  const { timeoutMs = 6000, maxBytes = 500_000 } = opts
  const parsed = new URL(urlStr)
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80
  const transport = parsed.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        host: address,
        port,
        path: (parsed.pathname || '/') + parsed.search,
        method: 'GET',
        headers: {
          Host: parsed.hostname,
          'User-Agent': 'Mozilla/5.0 (compatible; BudowaKosztyBot/1.0)',
        },
        servername: parsed.hostname, // TLS SNI
        timeout: timeoutMs,
      },
      (res: IncomingMessage) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk: string) => { if (body.length < maxBytes) body += chunk })
        res.on('end', () =>
          resolve({
            text: body,
            status: res.statusCode ?? 0,
            location: res.headers.location ?? null,
            finalUrl: urlStr,
          })
        )
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return Response.json({ error: 'URL wymagany' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(url) } catch {
    return Response.json({ error: 'Nieprawidłowy URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    return Response.json({ error: 'Niedozwolony protokół' }, { status: 400 })

  let title: string | null = null
  let thumbnail: string | null = null

  try {
    // TikTok oEmbed — trusted external API, safe to use built-in fetch
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
      const oembed = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { redirect: 'follow', signal: AbortSignal.timeout(5000) }
      )
      if (oembed.ok) {
        const data = await oembed.json()
        return Response.json({ title: data.title ?? null, thumbnail_url: data.thumbnail_url ?? null, url })
      }
    }

    // YouTube oEmbed — trusted external API, safe to use built-in fetch
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (oembed.ok) {
        const data = await oembed.json()
        return Response.json({ title: data.title ?? null, thumbnail_url: data.thumbnail_url ?? null, url })
      }
    }

    // OG tags fallback — user-supplied URL: validate DNS and connect to resolved IP
    let address: string
    try { address = await resolveAndValidate(parsed.hostname) } catch {
      return Response.json({ title: null, thumbnail_url: null, url })
    }

    let res = await ipFetch(url, address, { timeoutMs: 6000 })

    // Follow one redirect, re-validating the target
    if (res.status >= 300 && res.status < 400 && res.location) {
      try {
        // Resolve relative redirects against the original URL
        const redirectUrl = new URL(res.location, url)
        if (!['http:', 'https:'].includes(redirectUrl.protocol)) throw new Error('bad-protocol')
        const redirectAddress = await resolveAndValidate(redirectUrl.hostname)
        res = await ipFetch(redirectUrl.href, redirectAddress, { timeoutMs: 5000 })
      } catch {
        return Response.json({ title: null, thumbnail_url: null, url })
      }
    }

    return Response.json(parseOgTags(res.text, res.finalUrl))

  } catch {
    // timeout or network error — return empty metadata, caller saves url only
  }

  return Response.json({ title, thumbnail_url: thumbnail, url })
}

function parseOgTags(html: string, finalUrl: string) {
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
    ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)
  const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
    ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)

  let title = ogTitle?.[1] ?? titleTag?.[1] ?? null
  const thumbnail = ogImage?.[1] ?? null

  if (title) title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

  return { title, thumbnail_url: thumbnail, url: finalUrl }
}
