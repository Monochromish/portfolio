interface ItunesSong {
  artistName: string
  trackName: string
  artworkUrl100?: string
  trackViewUrl?: string
}

export interface SongLookup {
  art: string | null
  url: string | null
}

// "Artist feat. Guest" and "A & B" are listed under the first artist on Apple
const firstArtist = (artist: string) => artist.split(/\s*(?:,|&|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)[0] || artist
// "(Remastered 2011)" and " - Live" differ between services, so compare what is left
const bareTitle = (title: string) => title.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '') || title
const plain = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const loosely = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a))

// a wrong cover is worse than none, so a result counts only when artist and title both match
export const lookUpSong = defineCachedFunction(async (artist: string, title: string): Promise<SongLookup> => {
  const wantArtist = plain(firstArtist(artist))
  const wantTitle = plain(bareTitle(title))
  const url = new URL('https://itunes.apple.com/search')
  url.search = new URLSearchParams({ term: `${firstArtist(artist)} ${bareTitle(title)}`, entity: 'song', limit: '10' }).toString()
  // Apple allows about 20 searches a minute, so Cloudflare keeps each answer for a day
  const init: RequestInit & { cf: { cacheEverything: boolean, cacheTtl: number } } = {
    headers: { 'user-agent': 'himanshu.sh (+https://himanshu.sh)' },
    signal: AbortSignal.timeout(5000),
    cf: { cacheEverything: true, cacheTtl: 86400 },
  }
  const res = await fetch(url, init)
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: `iTunes search ${res.status}` })
  const { results = [] }: { results?: ItunesSong[] } = await res.json()
  const song = results.find(s => loosely(plain(s.artistName), wantArtist) && loosely(plain(bareTitle(s.trackName)), wantTitle))
  if (!song) return { art: null, url: null }
  const view = song.trackViewUrl ? new URL(song.trackViewUrl) : null
  view?.searchParams.delete('uo')
  return {
    // Apple resizes by path; 300 px matches the largest size the section shows
    art: song.artworkUrl100 ? artPath(song.artworkUrl100.replace(/\/\d+x\d+bb\.(\w+)$/, '/300x300bb.$1')) : null,
    url: view?.toString() ?? null,
  }
}, { name: 'itunes', maxAge: 60 * 60 * 24, getKey: (artist: string, title: string) => plain(`${artist} ${title}`).replace(/ /g, '-') })
