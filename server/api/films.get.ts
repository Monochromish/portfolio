import type { Film } from '#shared/types'

export default defineCachedEventHandler(async (event): Promise<Film[]> => {
  const { letterboxdUser } = useRuntimeConfig(event)
  const xml = await $fetch<string>(`https://letterboxd.com/${letterboxdUser}/rss/`, {
    responseType: 'text',
    headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' },
  })
  return parseLetterboxdFeed(xml).slice(0, 8)
}, { name: 'letterboxd', maxAge: 60 * 30, swr: true, getKey: () => 'feed' })
