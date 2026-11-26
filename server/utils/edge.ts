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
  const value = await compute()
  await cache?.put(key, Response.json(value, { headers: { 'cache-control': `max-age=${maxAgeS}` } }))
  return value
}
