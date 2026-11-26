interface ItunesSong {
  artistName: string
  trackName: string
  artworkUrl100?: string
  trackViewUrl?: string
}

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
const firstArtist = (artist: string) => artist.split(/\s*(?:,|&|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)[0] || artist
// "(Remastered 2011)" and " - Live" differ between services, so compare what is left
const bareTitle = (title: string) => title.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '') || title
const plain = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const loosely = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a))
// a wrong cover is worse than none, so a result counts only when artist and title both match
const matches = (artist: string, title: string, gotArtist: string, gotTitle: string) =>
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

async function itunes(artist: string, title: string): Promise<SongLookup | null> {
  const url = new URL('https://itunes.apple.com/search')
  url.search = new URLSearchParams({ term: `${firstArtist(artist)} ${bareTitle(title)}`, entity: 'song', limit: '10' }).toString()
  const { results = [] }: { results?: ItunesSong[] } = await (await search(url)).json()
  const song = results.find(s => matches(artist, title, s.artistName, s.trackName))
  if (!song?.artworkUrl100) return null
  const view = song.trackViewUrl ? new URL(song.trackViewUrl) : null
  view?.searchParams.delete('uo')
  // Apple resizes by path; 300 px matches the largest size the section shows
  return { art: artPath(song.artworkUrl100.replace(/\/\d+x\d+bb\.(\w+)$/, '/300x300bb.$1')), url: view?.toString() ?? null }
}

async function deezer(artist: string, title: string): Promise<SongLookup | null> {
  const url = new URL('https://api.deezer.com/search')
  url.search = new URLSearchParams({ q: `artist:"${firstArtist(artist)}" track:"${bareTitle(title)}"`, limit: '10' }).toString()
  const { data = [] }: { data?: DeezerTrack[] } = await (await search(url)).json()
  const song = data.find(s => matches(artist, title, s.artist.name, s.title))
  if (!song?.album.cover_big) return null
  return { art: artPath(song.album.cover_big.replace(/\/\d+x\d+-/, '/300x300-')), url: song.link }
}

export const lookUpSong = defineCachedFunction(async (artist: string, title: string): Promise<SongLookup> => {
  let failure: unknown
  for (const source of [itunes, deezer]) {
    try {
      const found = await source(artist, title)
      if (found?.art) return found
    }
    catch (error) {
      failure = error
      console.warn(`cover search for "${artist} - ${title}": ${error instanceof Error ? error.message : error}`)
    }
  }
  // a refusal is not a miss: leave it uncached so the next poll asks again
  if (failure) throw failure
  return { art: null, url: null }
}, { name: 'covers', maxAge: 60 * 60 * 24, getKey: (artist: string, title: string) => plain(`${artist} ${title}`).replace(/ /g, '-') })
