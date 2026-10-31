import { type ArtNode, inkPaths, inkTransform, sharedStickerDefs, stickerDefs, stickerTemplate, stickerView } from '#shared/guestbook'
import type { Sticker } from '#shared/types'

const NAME_RE = /^[a-z][\w:-]*$/i
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function artMarkup([tag, attrs, children]: ArtNode): string {
  if (!NAME_RE.test(tag)) throw new Error(`Bad tag name ${tag}`)
  let open = `<${tag}`
  for (const [name, value] of Object.entries(attrs)) {
    if (!NAME_RE.test(name)) throw new Error(`Bad attribute name ${name}`)
    open += ` ${name}="${escapeXml(String(value))}"`
  }
  return children?.length ? `${open}>${children.map(artMarkup).join('')}</${tag}>` : `${open}/>`
}

export function stickerSvg(sticker: Sticker) {
  const t = stickerTemplate(sticker.template)!
  const prefix = `s${sticker.id}-`
  const id = (name: string) => `${prefix}${t.id}-${name}`
  const view = stickerView(t)
  const ink = inkPaths(t, sticker.strokes).map((p): ArtNode => ['path', { 'd': p.d, 'stroke': p.hex, 'stroke-width': p.width }])
  const body: ArtNode[] = [
    ['defs', {}, [...sharedStickerDefs(prefix), ...stickerDefs(t, prefix)]],
    ['use', { href: `#${id('base')}` }],
    ['g', { 'clip-path': `url(#${id('ink')})` }, [['g', { 'transform': inkTransform(t), 'fill': 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ink]]],
    ['use', { href: `#${id('gloss')}` }],
  ]
  const title = escapeXml(`${t.label} sticker ${sticker.id}`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" width="${view.w}" height="${view.h}"><title>${title}</title>${body.map(artMarkup).join('')}</svg>`
}
