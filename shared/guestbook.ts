import type { Placement, StickerStroke } from './types'

export const GUESTBOOK_TURNSTILE_ACTION = 'guestbook'

// cells along the longer side of the drawing area
export const GRID = 1000
export const PRESSURE_STEPS = 8
// mice and fingers draw at step 5
export const PRESSURE_PLAIN = 5
export const MAX_STROKES = 150
export const MAX_STROKE_POINTS = 600
export const MAX_POINTS = 3000
export const MAX_INK_PATHS = 300
export const MAX_BODY_BYTES = 48 * 1024

type Attrs = Readonly<Record<string, string | number>>
export type ArtNode = readonly [tag: string, attrs: Attrs, children?: readonly ArtNode[]]
type Id = (name: string) => string

const el = (tag: string, attrs: Attrs = {}, ...children: ArtNode[]): ArtNode => children.length ? [tag, attrs, children] : [tag, attrs]
const stop = (offset: number, color: string, opacity = 1) => el('stop', opacity === 1 ? { offset, 'stop-color': color } : { offset, 'stop-color': color, 'stop-opacity': opacity })
const ref = (id: string) => `url(#${id})`

export interface StickerInk {
  name: string
  hex: string
}

export interface StickerTemplate {
  id: string
  label: string
  outline: string
  border: number
  bounds: readonly [x0: number, y0: number, x1: number, y1: number]
  region: Readonly<{ x: number, y: number, w: number, h: number }>
  clip: (id: Id) => ArtNode
  inks: readonly StickerInk[]
  sizes: readonly [fine: number, bold: number]
  defs?: (id: Id) => ArtNode[]
  face: (id: Id) => ArtNode[]
}

const hello: StickerTemplate = {
  id: 'hello',
  label: 'HELLO my name is name tag',
  outline: 'M13 0H237A13 13 0 0 1 250 13V155A13 13 0 0 1 237 168H13A13 13 0 0 1 0 155V13A13 13 0 0 1 13 0Z',
  border: 7,
  bounds: [0, 0, 250, 168],
  region: { x: 10, y: 64, w: 230, h: 86 },
  clip: () => el('rect', { x: 10, y: 64, width: 230, height: 86, rx: 4.5 }),
  inks: [{ name: 'Black', hex: '#1d2124' }, { name: 'Blue', hex: '#2a4fc7' }, { name: 'Red', hex: '#cf2e2a' }],
  sizes: [4, 8],
  defs: id => [
    el('linearGradient', { id: id('red'), x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#e2443a'), stop(1, '#cc2f29')),
  ],
  face: id => [
    el('use', { href: `#${id('o')}`, fill: ref(id('red')) }),
    el('rect', { x: 10, y: 64, width: 230, height: 86, rx: 4.5, fill: '#fff' }),
    el('path', { d: 'M2.7 0V-29.4H9.9V-18.3H21.5V-29.4H28.7V0H21.5V-11.6H9.9V0ZM34.5 0V-29.4H53.9V-22.7H41.8V-18H51.8V-11.5H41.8V-6.7H54.2V0ZM59.6 0V-29.4H66.9V-6.7H79.2V0ZM83.1 0V-29.4H90.3V-6.7H102.6V0ZM120.2 0.5Q115.6 0.5 112.1 -1.4Q108.6 -3.4 106.6 -6.8Q104.6 -10.2 104.6 -14.7Q104.6 -19.1 106.6 -22.5Q108.5 -26 112 -27.9Q115.5 -29.9 120.1 -29.9Q124.6 -29.9 128.1 -27.9Q131.6 -26 133.6 -22.5Q135.6 -19.1 135.6 -14.7Q135.6 -10.2 133.6 -6.8Q131.7 -3.4 128.2 -1.4Q124.7 0.5 120.2 0.5ZM120.2 -6.2Q122.5 -6.2 124.3 -7.3Q126.1 -8.3 127.2 -10.3Q128.2 -12.2 128.2 -14.7Q128.2 -17.2 127.1 -19.1Q126.1 -21 124.3 -22.1Q122.5 -23.2 120.1 -23.2Q117.7 -23.2 115.9 -22.1Q114.1 -21 113 -19.1Q112 -17.2 112 -14.7Q112 -12.2 113.1 -10.3Q114.1 -8.3 115.9 -7.3Q117.8 -6.2 120.2 -6.2Z', fill: '#fff', transform: 'translate(55.8 40)' }),
    el('path', { d: 'M1 0V-8H2.7L2.7 -6.9Q3.1 -7.5 3.7 -7.9Q4.3 -8.2 5 -8.2Q6 -8.2 6.6 -7.8Q7.3 -7.3 7.6 -6.4Q8 -7.3 8.6 -7.7Q9.2 -8.2 10.1 -8.2Q11.5 -8.2 12.3 -7.3Q13 -6.4 13 -4.6V0H11.2V-4.1Q11.2 -5.1 11 -5.6Q10.8 -6.1 10.5 -6.3Q10.1 -6.5 9.6 -6.5Q8.8 -6.5 8.3 -5.9Q7.9 -5.3 7.9 -4.2V0H6.1V-4.1Q6.1 -5.1 5.9 -5.6Q5.7 -6.1 5.3 -6.3Q5 -6.5 4.5 -6.5Q3.7 -6.5 3.2 -5.9Q2.8 -5.3 2.8 -4.2V0ZM15.9 3.4Q15.5 3.4 15 3.2Q14.6 3.1 14.2 2.9L14.8 1.4Q15.1 1.6 15.4 1.7Q15.6 1.7 15.8 1.7Q16.2 1.7 16.4 1.5Q16.7 1.3 16.9 1L17.3 -0.1L13.7 -8H15.7L18.1 -2.1L20.5 -8H22.5L18.7 0.9Q18.4 1.6 18.1 2.2Q17.7 2.8 17.2 3.1Q16.7 3.4 15.9 3.4ZM27.4 0V-8H29.1L29.1 -6.9Q29.5 -7.5 30.2 -7.9Q30.8 -8.2 31.6 -8.2Q32.5 -8.2 33.2 -7.8Q33.9 -7.4 34.2 -6.6Q34.6 -5.8 34.6 -4.5V0H32.8V-4.1Q32.8 -5.1 32.6 -5.6Q32.4 -6.1 32 -6.3Q31.6 -6.5 31.1 -6.5Q30.2 -6.5 29.7 -5.9Q29.2 -5.3 29.2 -4.2V0ZM39 0.2Q37.6 0.2 36.8 -0.5Q36 -1.1 36 -2.3Q36 -3.5 36.8 -4.2Q37.6 -4.8 39.2 -4.8H41.2Q41.1 -5.7 40.7 -6.2Q40.3 -6.6 39.5 -6.6Q38.9 -6.6 38.5 -6.4Q38.1 -6.1 37.8 -5.6L36.2 -6.2Q36.4 -6.7 36.9 -7.2Q37.3 -7.6 38 -7.9Q38.6 -8.2 39.5 -8.2Q40.7 -8.2 41.5 -7.7Q42.2 -7.3 42.6 -6.4Q43 -5.6 43 -4.4L43 0H41.3L41.2 -1Q40.9 -0.4 40.4 -0.1Q39.8 0.2 39 0.2ZM39.2 -1.3Q39.8 -1.3 40.3 -1.6Q40.7 -1.8 41 -2.3Q41.2 -2.7 41.2 -3.3V-3.4H39.7Q38.7 -3.4 38.2 -3.1Q37.8 -2.8 37.8 -2.3Q37.8 -1.8 38.2 -1.6Q38.5 -1.3 39.2 -1.3ZM44.8 0V-8H46.5L46.6 -6.9Q46.9 -7.5 47.5 -7.9Q48.1 -8.2 48.8 -8.2Q49.8 -8.2 50.4 -7.8Q51.1 -7.3 51.4 -6.4Q51.8 -7.3 52.4 -7.7Q53.1 -8.2 53.9 -8.2Q55.3 -8.2 56.1 -7.3Q56.8 -6.4 56.8 -4.6V0H55V-4.1Q55 -5.1 54.8 -5.6Q54.6 -6.1 54.3 -6.3Q53.9 -6.5 53.4 -6.5Q52.6 -6.5 52.1 -5.9Q51.7 -5.3 51.7 -4.2V0H49.9V-4.1Q49.9 -5.1 49.7 -5.6Q49.5 -6.1 49.2 -6.3Q48.8 -6.5 48.3 -6.5Q47.5 -6.5 47 -5.9Q46.6 -5.3 46.6 -4.2V0ZM62.2 0.2Q61 0.2 60.1 -0.3Q59.2 -0.9 58.7 -1.8Q58.2 -2.8 58.2 -4Q58.2 -5.2 58.7 -6.2Q59.2 -7.1 60.1 -7.7Q61.1 -8.2 62.3 -8.2Q63.3 -8.2 64.2 -7.6Q65.1 -7.1 65.6 -6.1Q66.1 -5 66.1 -3.6H60Q60.1 -2.6 60.8 -2Q61.4 -1.4 62.4 -1.4Q63.1 -1.4 63.6 -1.7Q64.1 -2.1 64.3 -2.6L65.9 -1.9Q65.6 -1.3 65 -0.8Q64.5 -0.3 63.8 -0.1Q63.1 0.2 62.2 0.2ZM60.1 -4.9H64.1Q64.1 -5.5 63.8 -5.9Q63.5 -6.3 63.1 -6.5Q62.7 -6.7 62.2 -6.7Q61.8 -6.7 61.3 -6.5Q60.8 -6.3 60.5 -5.9Q60.2 -5.5 60.1 -4.9ZM71.4 0V-8H73.2V0ZM72.3 -9.5Q71.9 -9.5 71.6 -9.8Q71.3 -10.1 71.3 -10.6Q71.3 -11 71.6 -11.3Q71.9 -11.6 72.3 -11.6Q72.7 -11.6 73 -11.3Q73.4 -11 73.4 -10.6Q73.4 -10.1 73 -9.8Q72.7 -9.5 72.3 -9.5ZM78.2 0.2Q77.4 0.2 76.7 -0.1Q76.1 -0.3 75.6 -0.7Q75.1 -1.2 74.9 -1.8L76.4 -2.4Q76.6 -2 77.1 -1.7Q77.6 -1.4 78.2 -1.4Q78.8 -1.4 79.2 -1.6Q79.5 -1.8 79.5 -2.2Q79.5 -2.6 79.2 -2.8Q79 -3 78.4 -3.1L77.7 -3.3Q76.5 -3.6 75.9 -4.2Q75.3 -4.9 75.3 -5.7Q75.3 -6.9 76 -7.5Q76.8 -8.2 78.3 -8.2Q79 -8.2 79.6 -8Q80.2 -7.8 80.7 -7.4Q81.1 -7 81.3 -6.5L79.8 -5.8Q79.7 -6.2 79.2 -6.4Q78.8 -6.6 78.2 -6.6Q77.7 -6.6 77.4 -6.4Q77.1 -6.1 77.1 -5.7Q77.1 -5.5 77.3 -5.3Q77.6 -5.1 78.1 -5L79.1 -4.7Q79.9 -4.5 80.4 -4.1Q80.8 -3.7 81.1 -3.2Q81.3 -2.7 81.3 -2.2Q81.3 -1.5 80.9 -0.9Q80.5 -0.4 79.8 -0.1Q79.1 0.2 78.2 0.2Z', fill: '#fff', transform: 'translate(83.8 55.5)' }),
  ],
}

export const STICKER_TEMPLATES: readonly StickerTemplate[] = [hello]
const byId = new Map(STICKER_TEMPLATES.map(t => [t.id, t]))
export const stickerTemplate = (id: string) => byId.get(id)

// the cut edge plus room for the shadow
export function stickerView(t: StickerTemplate) {
  const [x0, y0, x1, y1] = t.bounds
  const m = t.border
  return { x: x0 - m - 12, y: y0 - m - 10, w: x1 - x0 + 2 * m + 24, h: y1 - y0 + 2 * m + 32 }
}

export function stickerGrid(t: StickerTemplate) {
  const cell = Math.max(t.region.w, t.region.h) / GRID
  return { cell, cols: Math.round(t.region.w / cell), rows: Math.round(t.region.h / cell) }
}

export function sharedStickerDefs(prefix: string): ArtNode[] {
  return [
    el('filter', { 'id': `${prefix}shadow`, 'x': '-14%', 'y': '-14%', 'width': '128%', 'height': '140%', 'color-interpolation-filters': 'sRGB' },
      el('feDropShadow', { 'dx': 0, 'dy': 0.7, 'stdDeviation': 0.7, 'flood-color': '#0c262d', 'flood-opacity': 0.3 }),
      el('feDropShadow', { 'dx': 0, 'dy': 6, 'stdDeviation': 6, 'flood-color': '#0c262d', 'flood-opacity': 0.13 })),
    el('linearGradient', { id: `${prefix}vinyl`, x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#ffffff'), stop(1, '#edf1f0')),
    el('linearGradient', { id: `${prefix}sheen`, x1: 0, y1: 0, x2: 1, y2: 1 },
      stop(0, '#fff', 0.18), stop(0.3, '#fff', 0), stop(0.45, '#fff', 0), stop(0.52, '#fff', 0.24), stop(0.6, '#fff', 0), stop(1, '#fff', 0)),
  ]
}

const ids = (t: StickerTemplate, prefix: string): Id => name => `${prefix}${t.id}-${name}`

export function stickerDefs(t: StickerTemplate, prefix: string): ArtNode[] {
  const id = ids(t, prefix)
  const outline = `#${id('o')}`
  const span = 2 * t.border
  const paper = ref(`${prefix}vinyl`)
  return [
    el('path', { 'id': id('o'), 'd': t.outline, 'stroke-linejoin': 'round' }),
    el('clipPath', { id: id('cut') }, el('use', { href: outline })),
    el('clipPath', { id: id('ink') }, t.clip(id)),
    ...(t.defs?.(id) ?? []),
    el('g', { id: id('base') },
      el('g', { filter: ref(`${prefix}shadow`) },
        el('use', { 'href': outline, 'fill': '#d3dad9', 'stroke': '#d3dad9', 'stroke-width': span + 1.2 }),
        el('use', span ? { 'href': outline, 'fill': paper, 'stroke': paper, 'stroke-width': span } : { href: outline, fill: paper })),
      ...t.face(id)),
    el('g', { id: id('gloss') },
      el('use', span ? { 'href': outline, 'fill': ref(`${prefix}sheen`), 'stroke': ref(`${prefix}sheen`), 'stroke-width': span } : { href: outline, fill: ref(`${prefix}sheen`) })),
  ]
}

export function stickerHitArea(t: StickerTemplate, prefix: string): ArtNode {
  const id = ids(t, prefix)
  const { x, y, w, h } = t.region
  const [tag, attrs, children = []] = t.clip(id)
  const transform = `scale(${1 / w} ${1 / h}) translate(${-x} ${-y})${attrs.transform ? ` ${attrs.transform}` : ''}`
  return el('clipPath', { id: id('hit'), clipPathUnits: 'objectBoundingBox' }, el(tag, { ...attrs, transform }, ...children))
}

const STROKE_KEYS = ['color', 'size', 'points']

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
}

export function sameKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const own = Object.keys(value).sort()
  const want = [...keys].sort()
  return own.length === want.length && own.every((key, i) => key === want[i])
}

export function stickerProblem(t: StickerTemplate, strokes: unknown): string | null {
  if (!Array.isArray(strokes)) return 'strokes must be an array'
  if (strokes.length < 1) return 'Draw something first'
  if (strokes.length > MAX_STROKES) return `At most ${MAX_STROKES} strokes`
  const { cols, rows } = stickerGrid(t)
  let total = 0
  for (let s = 0; s < strokes.length; s++) {
    const stroke: unknown = strokes[s]
    if (!isPlainObject(stroke) || !sameKeys(stroke, STROKE_KEYS)) return `strokes[${s}] must have exactly color, size and points`
    const { color, size, points } = stroke
    if (!Number.isInteger(color) || (color as number) < 0 || (color as number) >= t.inks.length) return `strokes[${s}].color must be 0 to ${t.inks.length - 1}`
    if (size !== 0 && size !== 1) return `strokes[${s}].size must be 0 or 1`
    if (!Array.isArray(points) || points.length < 3 || points.length % 3) return `strokes[${s}].points must be x, y, pressure triples`
    const count = points.length / 3
    if (count > MAX_STROKE_POINTS) return `strokes[${s}] has more than ${MAX_STROKE_POINTS} points`
    total += count
    if (total > MAX_POINTS) return `More than ${MAX_POINTS} points in all`
    for (let i = 0; i < points.length; i += 3) {
      const x = points[i], y = points[i + 1], p = points[i + 2]
      if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(p)) return `strokes[${s}] point ${i / 3} must be whole numbers`
      if (x < 0 || y < 0 || x > cols || y > rows) return `strokes[${s}] point ${i / 3} is outside the ${cols} by ${rows} drawing area`
      if (p < 1 || p > PRESSURE_STEPS) return `strokes[${s}] point ${i / 3} pressure must be 1 to ${PRESSURE_STEPS}`
    }
  }
  if (inkPathCount(strokes as StickerStroke[]) > MAX_INK_PATHS) return `More than ${MAX_INK_PATHS} ink paths in all`
  return null
}

const widthOf = (size: number, step: number) => size * 16 + step

export function inkPathCount(strokes: readonly StickerStroke[]) {
  let paths = 0
  for (let i = 0; i < strokes.length;) {
    const color = strokes[i]!.color
    const widths = new Set<number>()
    for (; i < strokes.length && strokes[i]!.color === color; i++) takeWidths(widths, strokes[i]!.points, strokes[i]!.size)
    paths += widths.size
  }
  return paths
}

export function groupWidths(strokes: readonly StickerStroke[], color: number) {
  const widths = new Set<number>()
  for (let i = strokes.length - 1; i >= 0 && strokes[i]!.color === color; i--) takeWidths(widths, strokes[i]!.points, strokes[i]!.size)
  return widths
}

export function takeWidths(widths: Set<number>, points: readonly number[], size: number) {
  const before = widths.size
  for (let i = 2; i < points.length; i += 3) widths.add(widthOf(size, points[i]!))
  return widths.size - before
}

export function withinWidths(points: readonly number[], size: number, widths: ReadonlySet<number>, room: number) {
  const added = new Set<number>()
  for (let i = 0; i < points.length; i += 3) {
    const w = widthOf(size, points[i + 2]!)
    if (widths.has(w) || added.has(w)) continue
    if (added.size >= room) return points.slice(0, i)
    added.add(w)
  }
  return [...points]
}

export interface InkPath {
  hex: string
  width: number
  d: string
}

const pressureWidth = (step: number) => 0.4 + (step - 1) * 0.15
// half pressure lands on the plain width
export function pressureStep(pressure: number, held?: number) {
  const level = (0.25 + 1.5 * pressure - 0.4) / 0.15 + 1
  if (held !== undefined && Math.abs(level - held) < 0.85) return held
  return Math.max(1, Math.min(PRESSURE_STEPS, Math.round(level)))
}
const num = (v: number) => Math.round(v * 100) / 100

export function strokeRuns(points: readonly number[], base: number, add: (width: number, d: string) => void) {
  const n = points.length / 3
  const x = (i: number) => points[i * 3]!
  const y = (i: number) => points[i * 3 + 1]!
  const w = (i: number) => num(base * pressureWidth(points[i * 3 + 2]!))
  if (n === 1) {
    add(w(0), `M${x(0)} ${y(0)}h0.01`)
    return
  }
  const endX = (i: number) => i === n - 1 ? x(i) : (x(i) + x(i + 1)) / 2
  const endY = (i: number) => i === n - 1 ? y(i) : (y(i) + y(i + 1)) / 2
  let width = w(0)
  let d = `M${x(0)} ${y(0)}`
  for (let i = 0; i < n; i++) {
    const wi = w(i)
    if (wi !== width) {
      add(width, d)
      width = wi
      d = `M${endX(i - 1)} ${endY(i - 1)}`
    }
    d += i === 0 || i === n - 1 ? `L${endX(i)} ${endY(i)}` : `Q${x(i)} ${y(i)} ${endX(i)} ${endY(i)}`
  }
  add(width, d)
}

export function inkPaths(t: StickerTemplate, strokes: readonly StickerStroke[]): InkPath[] {
  const { cell } = stickerGrid(t)
  const out: InkPath[] = []
  let i = 0
  while (i < strokes.length) {
    const color = strokes[i]!.color
    const runs = new Map<number, string>()
    for (; i < strokes.length && strokes[i]!.color === color; i++) {
      const stroke = strokes[i]!
      strokeRuns(stroke.points, t.sizes[stroke.size]! / cell, (width, d) => runs.set(width, (runs.get(width) ?? '') + d))
    }
    for (const [width, d] of runs) out.push({ hex: t.inks[color]!.hex, width, d })
  }
  return out
}

export function inkTransform(t: StickerTemplate) {
  const { cell } = stickerGrid(t)
  return `translate(${t.region.x} ${t.region.y}) scale(${cell})`
}

// the board is 3:2 and a sticker is a fifth of its width on every screen, so everyone sees the same board
export const BOARD_ASPECT = 3 / 2
export const STICKER_WIDTH = 0.2

// half a sticker's height, as a share of the board's height
export function stickerHalfHeight(t: StickerTemplate) {
  const view = stickerView(t)
  return STICKER_WIDTH * view.h / view.w * BOARD_ASPECT / 2
}

export function onBoard(t: StickerTemplate, x: number, y: number) {
  const half = stickerHalfHeight(t)
  return { x: Math.min(1 - STICKER_WIDTH / 2, Math.max(STICKER_WIDTH / 2, x)), y: Math.min(1 - half, Math.max(half, y)) }
}

// one sticker hides another when centres are within SAME board widths and tilts within SAME_TILT degrees
const SAME = 0.03
const SAME_TILT = 3
// it moves aside by STEP board widths, a quarter of its own width, RINGS steps at most
const STEP = 0.05
const RINGS = 3
// down and to the right first, the way papers are dealt onto a pile
const SIDES: readonly (readonly [number, number])[] = [[1, 1], [1, 0], [0, 1], [-1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1]]
// stickers further than this from a drop, in board widths, cannot affect it
export const SETTLE_REACH = 0.4

export interface OnBoard extends Placement {
  template: string
}

// where it was dropped, unless that hides one of `others`: then the nearest of 24 spots around it that hides none, or the drop itself when all are taken
export function settleSticker(t: StickerTemplate, drop: Placement, others: readonly OnBoard[]): Placement {
  const taken = others.flatMap((o) => {
    const template = stickerTemplate(o.template)
    return template && Math.abs(o.rot - drop.rot) < SAME_TILT ? [onBoard(template, o.x, o.y)] : []
  })
  // in board widths: the board is BOARD_ASPECT times wider than tall
  const apart = (a: { x: number, y: number }, b: { x: number, y: number }) => Math.hypot(a.x - b.x, (a.y - b.y) / BOARD_ASPECT)
  const hides = (spot: { x: number, y: number }) => taken.some(o => apart(spot, o) < SAME)
  const start = onBoard(t, drop.x, drop.y)
  if (!hides(start)) return drop
  for (let ring = 1; ring <= RINGS; ring++) {
    for (const [sx, sy] of SIDES) {
      const spot = onBoard(t, start.x + sx * STEP * ring, start.y + sy * STEP * ring * BOARD_ASPECT)
      // at the board's edge a step can land back where it started
      if (apart(spot, start) >= SAME && !hides(spot)) return { x: Math.round(spot.x * 1e4) / 1e4, y: Math.round(spot.y * 1e4) / 1e4, rot: drop.rot }
    }
  }
  return drop
}
