interface AppleSong {
  attributes: { name: string, artistName: string, url: string }
}

interface AppleSearch {
  results?: { songs?: { data: AppleSong[] } }
}

interface AppleAlbums {
  data?: { attributes?: { editorialVideo?: Record<string, { video?: string } | undefined> } }[]
}

export interface Motion {
  video: string | null
  url: string | null
}

const API = 'https://api.music.apple.com/v1/catalog/us'
const KEEP_S = 60 * 60 * 24 * 30
const PAUSE_MS = 10 * 60_000
// square first: the cover is square
const FORMATS = ['motionDetailSquare', 'motionSquareVideo1x1']
const remembered = new Map<string, Motion>()
let pausedUntil = 0

async function apple(token: string, path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'authorization': `Bearer ${token}`, 'origin': 'https://himanshu.sh', 'user-agent': 'himanshu.sh (+https://himanshu.sh)' },
    signal: AbortSignal.timeout(5000),
  })
  // one refusal pauses every call for a while, so a limit is never pushed further
  if (res.status === 429 || res.status === 401 || res.status === 403) pausedUntil = Date.now() + PAUSE_MS
  if (!res.ok) throw new Error(`Apple Music answered ${res.status}`)
  return res
}

// a stream the browser may load: Apple's own https host and a playlist, nothing else
function playable(video: string | undefined) {
  if (!video) return null
  const url = new URL(video)
  return url.protocol === 'https:' && url.hostname.endsWith('.apple.com') && url.pathname.endsWith('.m3u8') ? url.toString() : null
}

async function resolve(token: string, artist: string, title: string): Promise<Motion> {
  const search = new URLSearchParams({ term: `${firstArtist(artist)} ${bareTitle(title)}`, types: 'songs', limit: '10' })
  const found: AppleSearch = await (await apple(token, `/search?${search}`)).json()
  const song = found.results?.songs?.data.find(s => matches(artist, title, s.attributes.artistName, s.attributes.name))
  if (!song) return { video: null, url: null }
  const album = new URL(song.attributes.url).pathname.match(/\/album\/[^/]+\/(\d+)$/)?.[1]
  if (!album) return { video: null, url: song.attributes.url }
  const { data = [] }: AppleAlbums = await (await apple(token, `/albums/${album}?extend=editorialVideo`)).json()
  const videos = data[0]?.attributes?.editorialVideo ?? {}
  const video = FORMATS.map(f => playable(videos[f]?.video)).find(Boolean) ?? null
  return { video, url: song.attributes.url }
}

// Apple is asked once per song and the answer, "no motion cover" included, is kept for 30 days,
// so its traffic follows the songs played and never the number of visitors
export async function lookUpMotion(token: string, artist: string, title: string): Promise<Motion | null> {
  if (!token) return null
  const key = `https://himanshu.sh/_motion/${encodeURIComponent(plain(`${artist} ${title}`))}`
  const known = remembered.get(key)
  if (known) return known
  const cache = typeof caches === 'undefined' ? null : await caches.open('motion')
  const kept = await cache?.match(key)
  if (kept) {
    const motion: Motion = await kept.json()
    remembered.set(key, motion)
    return motion
  }
  if (Date.now() < pausedUntil) return null
  try {
    const motion = await resolve(token, artist, title)
    remembered.set(key, motion)
    await cache?.put(key, Response.json(motion, { headers: { 'cache-control': `max-age=${KEEP_S}` } }))
    return motion
  }
  catch (error) {
    console.warn(`motion cover for "${artist} - ${title}": ${error instanceof Error ? error.message : error}`)
    return null
  }
}
