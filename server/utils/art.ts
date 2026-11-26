const SOURCES = {
  apple: { origin: 'https://is1-ssl.mzstatic.com', hosts: ['is1-ssl.mzstatic.com', 'is2-ssl.mzstatic.com', 'is3-ssl.mzstatic.com', 'is4-ssl.mzstatic.com', 'is5-ssl.mzstatic.com'], path: /^\/image\/thumb\/(?:[\w-]+(?:\.[\w-]+)*\/)+\d+x\d+bb\.(?:jpg|png|webp)$/ },
  deezer: { origin: 'https://cdn-images.dzcdn.net', hosts: ['cdn-images.dzcdn.net', 'e-cdns-images.dzcdn.net'], path: /^\/images\/cover\/[0-9a-f]{32}\/\d+x\d+-\d+-\d+-\d+-\d+\.jpg$/ },
  coverartarchive: { origin: 'https://coverartarchive.org', hosts: ['coverartarchive.org'], path: /^\/release\/[0-9a-f-]{36}\/front-(?:250|500)$/ },
  letterboxd: { origin: 'https://a.ltrbxd.com', hosts: ['a.ltrbxd.com'], path: /^\/resized\/[\w/-]+\.jpg$/ },
}

// art is served from this site so a visitor's browser never contacts Apple, Deezer, MusicBrainz or Letterboxd
export function artPath(url: string) {
  const { hostname, pathname } = new URL(url)
  const source = Object.entries(SOURCES).find(([, s]) => s.hosts.includes(hostname))
  return source && source[1].path.test(pathname) ? `/art/${source[0]}${pathname}` : null
}

export function artUpstream(path: string) {
  const match = path.match(/^\/art\/(\w+)(\/.*)$/)
  const source = match && Object.entries(SOURCES).find(([name]) => name === match[1])?.[1]
  return source && source.path.test(match[2]!) ? `${source.origin}${match[2]}` : null
}
