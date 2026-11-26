const SOURCES = {
  // isN-ssl hosts are shards of one store and serve the same paths
  apple: { origin: 'https://is1-ssl.mzstatic.com', hosts: ['is1-ssl.mzstatic.com', 'is2-ssl.mzstatic.com', 'is3-ssl.mzstatic.com', 'is4-ssl.mzstatic.com', 'is5-ssl.mzstatic.com'], path: /^\/image\/thumb\/(?!.*\.\.)[\w./-]+\/\d+x\d+bb\.jpg$/ },
  letterboxd: { origin: 'https://a.ltrbxd.com', hosts: ['a.ltrbxd.com'], path: /^\/resized\/[\w/-]+\.jpg$/ },
}

// art is served from this site so a visitor's browser never contacts Apple or Letterboxd
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
