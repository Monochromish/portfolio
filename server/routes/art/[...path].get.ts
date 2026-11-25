import { createError, defineEventHandler } from 'nuxt/server'

// raster only: an SVG served from this origin could run script
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

export default defineEventHandler(async (event) => {
  const upstream = artUpstream(event.url.pathname)
  if (!upstream) throw createError({ status: 404, statusText: 'no such artwork' })
  // cf is read by the Workers runtime: repeat requests are answered from Cloudflare's cache, not the upstream CDN
  const init: RequestInit & { cf: { cacheEverything: boolean, cacheTtl: number } } = {
    headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' },
    signal: AbortSignal.timeout(8000),
    cf: { cacheEverything: true, cacheTtl: 604800 },
  }
  const res = await fetch(upstream, init)
  const type = res.headers.get('content-type')?.split(';')[0]
  if (!res.ok || !type || !IMAGE_TYPES.has(type)) throw createError({ status: 502, statusText: `artwork ${upstream}: ${res.status} ${type}` })
  event.res.headers.set('content-type', type)
  event.res.headers.set('cache-control', 'public, max-age=86400')
  return res.body
})
