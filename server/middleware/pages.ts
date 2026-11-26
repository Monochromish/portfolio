export default defineEventHandler(async (event) => {
  const key = pageKey(event)
  if (!key) return
  const kept = await (await caches.open('pages')).match(key.url)
  if (!kept) return
  const headers = new Headers(kept.headers)
  headers.set('cache-control', headers.get('x-cache-control') ?? 'no-cache')
  headers.delete('x-cache-control')
  headers.set('x-page-cache', 'hit')
  return sendWebResponse(event, new Response(kept.body, { headers }))
})
