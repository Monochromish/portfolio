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
// after a failed call, Last.fm is left alone for a minute so an outage can't burn the API key
const BACKOFF_MS = 60_000
let failedAt = 0

export default defineCachedEventHandler(async (event): Promise<Track[]> => {
  const { lastfmApiKey, lastfmUser } = useRuntimeConfig(event)
  if (!lastfmApiKey) throw createError({ statusCode: 503, statusMessage: 'NUXT_LASTFM_API_KEY is not set' })
  if (Date.now() - failedAt < BACKOFF_MS) throw createError({ statusCode: 503, statusMessage: 'Last.fm failed recently, trying again shortly' })
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/')
    url.search = new URLSearchParams({ method: 'user.getrecenttracks', user: lastfmUser, api_key: lastfmApiKey, format: 'json', limit: '20' }).toString()
    const res = await fetch(url, { headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' }, signal: AbortSignal.timeout(5000) })
    const data = await res.json() as LastfmRecent
    if (!res.ok || !data.recenttracks) throw createError({ statusCode: 502, statusMessage: `Last.fm error ${data.error ?? res.status}: ${data.message ?? res.statusText}` })
    // 20 leaves four different tracks after repeat plays fold into one row
    return [data.recenttracks.track].flat().slice(0, 20).map((t) => {
      const art = t.image.find(i => i.size === 'extralarge')?.['#text'] || ''
      return {
        title: t.name,
        artist: t.artist['#text'],
        album: t.album['#text'],
        url: t.url,
        art: art && !art.includes(NO_ART) ? art : null,
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
