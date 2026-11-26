export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, { body }) => {
    const key = pageKey(event)
    const { cloudflare } = event.context
    if (!key || !cloudflare || typeof body !== 'string' || getResponseStatus(event) !== 200 || getResponseHeader(event, 'x-page-cache')) return
    const headers = new Headers()
    for (const [name, value] of Object.entries(getResponseHeaders(event))) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : String(value))
    }
    if (headers.has('set-cookie') || headers.get('cache-control')?.includes('no-store')) return
    headers.set('x-cache-control', headers.get('cache-control') ?? 'no-cache')
    headers.set('cache-control', `max-age=${key.keep}`)
    cloudflare.context.waitUntil(caches.open('pages').then(cache => cache.put(key.url, new Response(body, { headers }))))
  })
})
