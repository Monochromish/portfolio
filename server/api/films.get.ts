import type { Film } from '#shared/types'

// after a failed fetch, Letterboxd is left alone for a minute
const BACKOFF_MS = 60_000
let failedAt = 0

export default defineCachedEventHandler(async (event): Promise<Film[]> => {
  if (Date.now() - failedAt < BACKOFF_MS) throw createError({ statusCode: 503, statusMessage: 'Letterboxd failed recently, trying again shortly' })
  const { letterboxdUser } = useRuntimeConfig(event)
  try {
    const xml = await $fetch<string>(`https://letterboxd.com/${letterboxdUser}/rss/`, {
      responseType: 'text',
      headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' },
      signal: AbortSignal.timeout(8000),
    })
    return parseLetterboxdFeed(xml).slice(0, 8)
  }
  catch (error) {
    failedAt = Date.now()
    throw error
  }
}, { name: 'letterboxd', maxAge: 60 * 30, swr: true, getKey: () => 'feed' })
