import type { Track } from '#shared/types'

interface ListenMetadata {
  artist_name: string
  track_name: string
  release_name?: string
  mbid_mapping?: { recording_mbid?: string }
}

interface Listen {
  listened_at?: number
  track_metadata: ListenMetadata
}

interface ListensResponse {
  payload?: { listens: Listen[] }
  error?: string
}

const DISTINCT = 4
const BACKOFF_MS = 60_000
let failedAt = 0

async function listens(path: string) {
  const res = await fetch(`https://api.listenbrainz.org/1/user/${path}`, { headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' }, signal: AbortSignal.timeout(5000) })
  const data: ListensResponse = await res.json()
  if (!res.ok || !data.payload) throw createError({ statusCode: 502, statusMessage: `ListenBrainz error ${res.status}: ${data.error ?? res.statusText}` })
  return data.payload.listens
}

export default defineCachedEventHandler(async (event): Promise<Track[]> => {
  const { listenbrainzUser } = useRuntimeConfig(event)
  if (!listenbrainzUser) throw createError({ statusCode: 503, statusMessage: 'NUXT_LISTENBRAINZ_USER is not set' })
  if (Date.now() - failedAt < BACKOFF_MS) throw createError({ statusCode: 503, statusMessage: 'ListenBrainz failed recently, trying again shortly' })
  try {
    const user = encodeURIComponent(listenbrainzUser)
    // a song on repeat can fill a short page by itself, so ask for more than four
    const [playing, recent] = await Promise.all([listens(`${user}/playing-now`), listens(`${user}/listens?count=100`)])
    // newest first, so a replayed song keeps only its latest play and never takes a second row
    const heard = new Set<string>()
    const distinct = [...playing, ...recent].filter((l) => {
      const song = `${l.track_metadata.artist_name}\n${l.track_metadata.track_name}`.toLowerCase()
      return !heard.has(song) && !!heard.add(song)
    }).slice(0, DISTINCT)
    return await Promise.all(distinct.map(async (l, i): Promise<Track> => {
      const { artist_name: artist, track_name: title, release_name: album = '', mbid_mapping: mapping } = l.track_metadata
      const found = await lookUpSong(artist, title).catch(() => ({ art: null, url: null }))
      const fallback = mapping?.recording_mbid
        ? `https://musicbrainz.org/recording/${mapping.recording_mbid}`
        : `https://music.apple.com/us/search?${new URLSearchParams({ term: `${artist} ${title}` })}`
      return {
        title,
        artist,
        album,
        url: found.url ?? fallback,
        art: found.art,
        playedAt: l.listened_at ? l.listened_at * 1000 : null,
        nowPlaying: i < playing.length,
      }
    }))
  }
  catch (error) {
    failedAt = Date.now()
    throw error
  }
}, { name: 'listenbrainz', maxAge: 30, swr: true, getKey: () => 'recent' })
