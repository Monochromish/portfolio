const SOURCES = {
  lastfm: { origin: 'https://lastfm-img.freetls.fastly.net', hosts: ['lastfm-img.freetls.fastly.net', 'lastfm.freetls.fastly.net'], path: /^\/i\/u\/\w+\/[0-9a-f]+\.(?:jpg|png|gif|webp)$/ },
  letterboxd: { origin: 'https://a.ltrbxd.com', hosts: ['a.ltrbxd.com'], path: /^\/resized\/[\w/-]+\.jpg$/ },
}

// art is served from this site so a visitor's browser never contacts Last.fm or Letterboxd
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
