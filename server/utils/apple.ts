interface AppleSong {
  attributes: { name: string, artistName: string, albumName: string, url: string, artwork?: { url: string } }
}

interface AppleSearch {
  results?: { songs?: { data: AppleSong[] } }
}

interface AppleAlbums {
  data?: { attributes?: { editorialVideo?: Record<string, { video?: string } | undefined> } }[]
}

export interface AppleLookup {
  art: string | null
  video: string | null
  url: string | null
}

// "Artist feat. Guest" and "A & B" are listed under the first artist
const firstArtist = (artist: string) => artist.split(/\s*(?:,|&|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)[0] || artist
// "(Remastered 2011)" and " - Live" differ between services, so compare what is left
const bareTitle = (title: string) => title.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '') || title
const plain = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const loosely = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a))
// a wrong cover is worse than none, so a result counts only when artist and title both match
const matches = (artist: string, title: string, gotArtist: string, gotTitle: string) =>
  loosely(plain(gotArtist), plain(firstArtist(artist))) && loosely(plain(bareTitle(gotTitle)), plain(bareTitle(title)))

const API = 'https://api.music.apple.com/v1/catalog/us'
const KEEP_S = 60 * 60 * 24 * 30
const PAUSE_MS = 10 * 60_000
// three times the large cover's 148 px, so it stays sharp on any screen
const ART_PX = 450
// square first: the cover is square
const FORMATS = ['motionDetailSquare', 'motionSquareVideo1x1']
const remembered = new Map<string, AppleLookup>()
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

// Apple's artwork url is a template that names its own size and format
function artOf(song: AppleSong) {
  const template = song.attributes.artwork?.url
  if (!template) return null
  return artPath(template.replace('{w}', `${ART_PX}`).replace('{h}', `${ART_PX}`).replace('{c}', 'bb').replace('{f}', 'jpg'))
}

const albumId = (song: AppleSong) => new URL(song.attributes.url).pathname.match(/\/album\/[^/]+\/(\d+)$/)?.[1]

// a song usually sits on its single as well as its album, and singles rarely have a motion cover,
// so the album that was played comes first and the song's own single last
function rank(songs: AppleSong[], title: string, album: string) {
  const played = plain(album)
  const named = plain(bareTitle(title))
  const score = (s: AppleSong) => {
    const on = plain(s.attributes.albumName)
    if (played && (on.includes(played) || played.includes(on))) return 0
    return on.includes(named) ? 2 : 1
  }
  return songs.map(song => ({ song, score: score(song) })).sort((a, b) => a.score - b.score).map(r => r.song)
}

async function videoOf(token: string, album: string) {
  const { data = [] }: AppleAlbums = await (await apple(token, `/albums/${album}?extend=editorialVideo`)).json()
  const videos = data[0]?.attributes?.editorialVideo ?? {}
  const video = FORMATS.map(f => playable(videos[f]?.video)).find(Boolean) ?? null
  if (!video) console.info(`no motion cover on album ${album}; Apple listed ${Object.keys(videos).join(', ') || 'no videos'}`)
  return video
}

async function resolve(token: string, artist: string, title: string, album: string): Promise<AppleLookup> {
  const search = new URLSearchParams({ term: `${firstArtist(artist)} ${bareTitle(title)}`, types: 'songs', limit: '10' })
  const found: AppleSearch = await (await apple(token, `/search?${search}`)).json()
  const songs = rank((found.results?.songs?.data ?? []).filter(s => matches(artist, title, s.attributes.artistName, s.attributes.name)), title, album)
  const first = songs[0]
  if (!first) return { art: null, video: null, url: null }
  const art = artOf(first)
  // two albums at most, so a song on many compilations costs Apple no more than three calls
  const albums = [...new Map(songs.map(s => [albumId(s), s])).entries()].filter(([id]) => id).slice(0, 2)
  for (const [id, song] of albums) {
    const video = id ? await videoOf(token, id) : null
    if (video) return { art, video, url: song.attributes.url }
  }
  return { art, video: null, url: first.attributes.url }
}

// Apple is asked once per song and the answer, a miss included, is kept for 30 days or until the next deploy,
// so its traffic follows the songs played and never the number of visitors
export async function lookUpApple(token: string, artist: string, title: string, album: string): Promise<AppleLookup | null> {
  if (!token) return null
  // a deploy asks again, so a fix to the lookup is never hidden behind an answer kept from before it
  const key = `https://himanshu.sh/_apple/${useRuntimeConfig().public.commit}/${encodeURIComponent(plain(`${artist} ${title} ${album}`))}`
  const known = remembered.get(key)
  if (known) return known
  const cache = typeof caches === 'undefined' ? null : await caches.open('apple')
  const kept = await cache?.match(key)
  if (kept) {
    const found: AppleLookup = await kept.json()
    remembered.set(key, found)
    return found
  }
  if (Date.now() < pausedUntil) return null
  try {
    const found = await resolve(token, artist, title, album)
    remembered.set(key, found)
    await cache?.put(key, Response.json(found, { headers: { 'cache-control': `max-age=${KEEP_S}` } }))
    return found
  }
  catch (error) {
    console.warn(`Apple Music lookup for "${artist} - ${title}": ${error instanceof Error ? error.message : error}`)
    return null
  }
}
