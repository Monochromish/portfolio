const LAST_GOOD_S = 60 * 60 * 24

// the in-memory cache lives and dies with one server instance; Cloudflare's edge cache is shared by
// every instance in a data centre, so a fresh instance answers from it instead of asking upstream again
export async function fromEdge<T>(name: string, maxAgeS: number, compute: () => Promise<T>): Promise<T> {
  const cache = typeof caches === 'undefined' ? null : await caches.open('api')
  // a deploy starts with an empty slate, so a changed response shape never meets an old one
  const key = `https://himanshu.sh/_edge/${useRuntimeConfig().public.commit}/${name}`
  const kept = await cache?.match(key)
  if (kept) {
    const value: T = await kept.json()
    return value
  }
  try {
    const value = await compute()
    await Promise.all([
      cache?.put(key, Response.json(value, { headers: { 'cache-control': `max-age=${maxAgeS}` } })),
      cache?.put(`${key}/last-good`, Response.json(value, { headers: { 'cache-control': `max-age=${LAST_GOOD_S}` } })),
    ])
    return value
  }
  catch (error) {
    // a brief upstream failure shows the last good answer, so the section never disappears for a visitor
    const last = await cache?.match(`${key}/last-good`)
    if (!last) throw error
    console.warn(`${name}: serving the last good answer after ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`)
    const value: T = await last.json()
    return value
  }
}
