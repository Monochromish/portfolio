import type { Film } from '#shared/types'

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: '\u00A0' }

const decode = (text: string) => text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) =>
  code[0] === '#'
    ? String.fromCodePoint(code[1]!.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1)))
    : ENTITIES[code.toLowerCase()] ?? entity)

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(String.raw`<${name}(?:\s[^>]*)?>([\s\S]*?)</${name}>`))
  if (!match) return ''
  const raw = match[1]!.trim()
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return cdata ? cdata[1]! : decode(raw)
}

export function parseLetterboxdFeed(xml: string): Film[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(m => m[1]!)
    .filter(item => tag(item, 'letterboxd:filmTitle'))
    .map((item) => {
      const rating = tag(item, 'letterboxd:memberRating')
      const poster = tag(item, 'description').match(/<img[^>]+src="([^"]+)"/)?.[1]
      return {
        title: tag(item, 'letterboxd:filmTitle'),
        year: Number(tag(item, 'letterboxd:filmYear')) || null,
        rating: rating ? Number(rating) : null,
        liked: tag(item, 'letterboxd:memberLike') === 'Yes',
        rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
        watchedOn: tag(item, 'letterboxd:watchedDate') || null,
        reviewed: tag(item, 'guid').startsWith('letterboxd-review'),
        url: tag(item, 'link'),
        poster: poster ? decode(poster) : null,
      }
    })
}
