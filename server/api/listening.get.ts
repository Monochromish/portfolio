import type { Track } from '#shared/types'

interface LastfmTrack {
  name: string
  url: string
  artist: { '#text': string }
  album: { '#text': string }
  image: { size: string, '#text': string }[]
  date?: { uts: string }
  '@attr'?: { nowplaying?: string }
}

interface LastfmRecent {
  recenttracks?: { track: LastfmTrack | LastfmTrack[] }
  error?: number
  message?: string
}

// grey-star placeholder Last.fm serves for missing artwork
const NO_ART = '2a96cbd8b46e442fc41c2b86b821562f'
const DISTINCT = 4
const BACKOFF_MS = 60_000
let failedAt = 0

export default defineCachedEventHandler(async (event): Promise<Track[]> => {
  const { lastfmApiKey, lastfmUser } = useRuntimeConfig(event)
  if (!lastfmApiKey) throw createError({ statusCode: 503, statusMessage: 'NUXT_LASTFM_API_KEY is not set' })
  if (Date.now() - failedAt < BACKOFF_MS) throw createError({ statusCode: 503, statusMessage: 'Last.fm failed recently, trying again shortly' })
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/')
    // 200 is the most Last.fm returns in one page: a song on repeat can fill a short page by itself
    url.search = new URLSearchParams({ method: 'user.getrecenttracks', user: lastfmUser, api_key: lastfmApiKey, format: 'json', limit: '200' }).toString()
    const res = await fetch(url, { headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' }, signal: AbortSignal.timeout(5000) })
    const data = await res.json() as LastfmRecent
    if (!res.ok || !data.recenttracks) throw createError({ statusCode: 502, statusMessage: `Last.fm error ${data.error ?? res.status}: ${data.message ?? res.statusText}` })
    // newest first, so a replayed song keeps only its latest play and never takes a second row
    const heard = new Set<string>()
    const distinct = [data.recenttracks.track].flat().filter((t) => {
      const song = `${t.artist['#text']}\n${t.name}`.toLowerCase()
      return !heard.has(song) && !!heard.add(song)
    })
    return distinct.slice(0, DISTINCT).map((t) => {
      const art = t.image.find(i => i.size === 'extralarge')?.['#text'] || ''
      return {
        title: t.name,
        artist: t.artist['#text'],
        album: t.album['#text'],
        url: t.url,
        art: art && !art.includes(NO_ART) ? artPath(art) : null,
        playedAt: t.date ? Number(t.date.uts) * 1000 : null,
        nowPlaying: t['@attr']?.nowplaying === 'true',
      }
    })
  }
  catch (error) {
    failedAt = Date.now()
    throw error
  }
}, { name: 'lastfm', maxAge: 30, swr: true, getKey: () => 'recent' })
