interface DeezerTrack {
  title: string
  link: string
  artist: { name: string }
  album: { cover_big?: string }
}

export interface SongLookup {
  art: string | null
  url: string | null
}

// "Artist feat. Guest" and "A & B" are listed under the first artist
export const firstArtist = (artist: string) => artist.split(/\s*(?:,|&|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)[0] || artist
// "(Remastered 2011)" and " - Live" differ between services, so compare what is left
export const bareTitle = (title: string) => title.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '') || title
export const plain = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const loosely = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a))
// a wrong cover is worse than none, so a result counts only when artist and title both match
export const matches = (artist: string, title: string, gotArtist: string, gotTitle: string) =>
  loosely(plain(gotArtist), plain(firstArtist(artist))) && loosely(plain(bareTitle(gotTitle)), plain(bareTitle(title)))

async function search(url: URL) {
  // Cloudflare keeps a good answer for a day and never keeps a refusal
  const init: RequestInit & { cf: { cacheEverything: boolean, cacheTtlByStatus: Record<string, number> } } = {
    headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' },
    signal: AbortSignal.timeout(5000),
    cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400, '300-599': 0 } },
  }
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${url.hostname} answered ${res.status}`)
  return res
}

async function deezer(artist: string, title: string): Promise<SongLookup | null> {
  const url = new URL('https://api.deezer.com/search')
  // a plain query: Deezer's artist:"" filter finds nothing for names like A$AP Rocky
  url.search = new URLSearchParams({ q: `${firstArtist(artist)} ${bareTitle(title)}`, limit: '10' }).toString()
  const { data = [] }: { data?: DeezerTrack[] } = await (await search(url)).json()
  const song = data.find(s => matches(artist, title, s.artist.name, s.title))
  if (!song?.album.cover_big) return null
  // Deezer resizes by path; 300 px matches the largest size the section shows
  return { art: artPath(song.album.cover_big.replace(/\/\d+x\d+-/, '/300x300-')), url: song.link }
}

// Apple's search would be first choice, but it answers 403 to requests from Cloudflare
export const lookUpSong = defineCachedFunction(async (artist: string, title: string): Promise<SongLookup> => {
  try {
    return await deezer(artist, title) ?? { art: null, url: null }
  }
  catch (error) {
    // a refusal is not a miss: thrown, it stays uncached and the next refresh asks again
    console.warn(`cover search for "${artist} - ${title}": ${error instanceof Error ? error.message : error}`)
    throw error
  }
}, { name: 'covers', maxAge: 60 * 60 * 24, getKey: (artist: string, title: string) => plain(`${artist} ${title}`).replace(/ /g, '-') })
