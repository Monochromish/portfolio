import type { StickerStroke } from './types'

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
  paper?: string
  defs?: (id: Id) => ArtNode[]
  face: (id: Id) => ArtNode[]
}

const MANTA = 'M140 31.6C145 31.4 149 31 152.4 29.6C153.2 25.2 153.4 21.2 155.2 18.4C156.6 16.4 159.8 16.2 161.6 18.6C163.2 21.4 163.6 27.2 164.6 32.6C180 35.6 202 40.6 226 52.6C246 62.6 263 77.6 274.5 93.6C258 94.6 228 97.6 204 106.6C186 113 173.5 121.6 167.5 130.4C167.6 136.6 165.4 142.4 161.2 143.6C156.6 144.6 151.4 142.8 146.4 140.6C144.8 156 143 175 141.6 187C141 190.6 140.5 192.4 140 192.4C139.5 192.4 139 190.6 138.4 187C137 175 135.2 156 133.6 140.6C128.6 142.8 123.4 144.6 118.8 143.6C114.6 142.4 112.4 136.6 112.5 130.4C106.5 121.6 94 113 76 106.6C52 97.6 22 94.6 5.5 93.6C17 77.6 34 62.6 54 52.6C78 40.6 100 35.6 115.4 32.6C116.4 27.2 116.8 21.4 118.4 18.6C120.2 16.2 123.4 16.4 124.8 18.4C126.6 21.2 126.8 25.2 127.6 29.6C131 31 135 31.4 140 31.6Z'

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

const bubble: StickerTemplate = {
  id: 'bubble',
  label: 'Speech bubble',
  outline: 'M44 0H196A44 44 0 0 1 240 44V106A44 44 0 0 1 196 150H104C90 162 66 178 34 187C47 172 55 161 58 150H44A44 44 0 0 1 0 106V44A44 44 0 0 1 44 0Z',
  border: 7,
  bounds: [0, 0, 240, 187],
  region: { x: 8, y: 8, w: 224, h: 134 },
  clip: () => el('rect', { x: 5.5, y: 5.5, width: 229, height: 139, rx: 38.5 }),
  inks: [{ name: 'Ink', hex: '#0c262d' }, { name: 'Teal', hex: '#0a7682' }, { name: 'Coral', hex: '#e2553b' }],
  sizes: [4, 8],
  face: id => [
    el('use', { href: `#${id('o')}`, fill: '#fff' }),
    el('g', { 'clip-path': ref(id('cut')) }, el('use', { href: `#${id('o')}`, fill: 'none', stroke: '#38a5b0', 'stroke-width': 11 })),
  ],
}

const manta: StickerTemplate = {
  id: 'manta',
  label: 'Manta ray',
  outline: MANTA,
  border: 7,
  bounds: [5.5, 16.2, 274.5, 192.4],
  region: { x: 5.5, y: 32.6, w: 269, h: 112 },
  clip: () => el('path', { d: 'M115.4 32.6L164.6 32.6C180 35.6 202 40.6 226 52.6C246 62.6 263 77.6 274.5 93.6C258 94.6 228 97.6 204 106.6C186 113 173.5 121.6 167.5 130.4C167.6 136.6 165.4 142.4 161.2 143.6C156.6 144.6 151.4 142.8 146.4 140.6L133.6 140.6C128.6 142.8 123.4 144.6 118.8 143.6C114.6 142.4 112.4 136.6 112.5 130.4C106.5 121.6 94 113 76 106.6C52 97.6 22 94.6 5.5 93.6C17 77.6 34 62.6 54 52.6C78 40.6 100 35.6 115.4 32.6Z' }),
  inks: [{ name: 'White', hex: '#f6faf8' }, { name: 'Aqua', hex: '#7fe6d8' }, { name: 'Coral', hex: '#ff8f78' }],
  sizes: [4.5, 9],
  defs: id => [
    el('radialGradient', { id: id('back'), cx: 140, cy: 86, r: 150, gradientUnits: 'userSpaceOnUse' }, stop(0, '#34454f'), stop(0.45, '#1d2a32'), stop(1, '#0b1318')),
    el('radialGradient', { id: id('mark-r'), cx: 170, cy: 41, r: 58, gradientUnits: 'userSpaceOnUse' }, stop(0, '#e6eeef', 0.92), stop(0.5, '#c9d7da', 0.6), stop(1, '#a9bbc1', 0)),
    el('radialGradient', { id: id('mark-l'), cx: 110, cy: 41, r: 58, gradientUnits: 'userSpaceOnUse' }, stop(0, '#e6eeef', 0.92), stop(0.5, '#c9d7da', 0.6), stop(1, '#a9bbc1', 0)),
  ],
  face: id => [
    el('use', { href: `#${id('o')}`, fill: ref(id('back')) }),
    el('path', { d: 'M167 38.4C184 40 204 45.5 224 55C214 62 202 70 188 80C178 74 171 62 167 38.4Z', fill: ref(id('mark-r')) }),
    el('path', { d: 'M113 38.4C96 40 76 45.5 56 55C66 62 78 70 92 80C102 74 109 62 113 38.4Z', fill: ref(id('mark-l')) }),
    el('path', { 'd': 'M168 36.6C181 39 203 44 226 55.6C244 64.6 259 77 269 89M112 36.6C99 39 77 44 54 55.6C36 64.6 21 77 11 89', 'fill': 'none', 'stroke': '#fff', 'stroke-opacity': 0.16, 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    el('circle', { cx: 161.6, cy: 39.8, r: 1.7, fill: '#060b0e' }),
    el('circle', { cx: 118.4, cy: 39.8, r: 1.7, fill: '#060b0e' }),
  ],
}

const sun: StickerTemplate = {
  id: 'sun',
  label: 'Sun',
  outline: 'M99.2 43.2L110 15.1Q112 10 114 15.1L124.8 43.2A70 70 0 0 1 135.4 46L135.4 46L158.7 27.1Q163 23.7 162.1 29.1L157.5 58.8A70 70 0 0 1 165.2 66.5L165.2 66.5L194.9 61.9Q200.3 61 196.9 65.3L178 88.6A70 70 0 0 1 180.8 99.2L180.8 99.2L208.9 110Q214 112 208.9 114L180.8 124.8A70 70 0 0 1 178 135.4L178 135.4L196.9 158.7Q200.3 163 194.9 162.1L165.2 157.5A70 70 0 0 1 157.5 165.2L157.5 165.2L162.1 194.9Q163 200.3 158.7 196.9L135.4 178A70 70 0 0 1 124.8 180.8L124.8 180.8L114 208.9Q112 214 110 208.9L99.2 180.8A70 70 0 0 1 88.6 178L88.6 178L65.3 196.9Q61 200.3 61.9 194.9L66.5 165.2A70 70 0 0 1 58.8 157.5L58.8 157.5L29.1 162.1Q23.7 163 27.1 158.7L46 135.4A70 70 0 0 1 43.2 124.8L43.2 124.8L15.1 114Q10 112 15.1 110L43.2 99.2A70 70 0 0 1 46 88.6L46 88.6L27.1 65.3Q23.7 61 29.1 61.9L58.8 66.5A70 70 0 0 1 66.5 58.8L66.5 58.8L61.9 29.1Q61 23.7 65.3 27.1L88.6 46A70 70 0 0 1 99.2 43.2Z',
  border: 7,
  bounds: [10, 10, 214, 214],
  region: { x: 48, y: 48, w: 128, h: 128 },
  clip: () => el('circle', { cx: 112, cy: 112, r: 64 }),
  inks: [{ name: 'Brown', hex: '#4a2a0c' }, { name: 'Red', hex: '#d9402a' }, { name: 'Teal', hex: '#0a7682' }],
  sizes: [4, 8],
  defs: id => [
    el('radialGradient', { id: id('disc'), cx: 0.42, cy: 0.38, r: 0.66 }, stop(0, '#fff6cf'), stop(0.6, '#ffe58a'), stop(1, '#ffd25c')),
    el('linearGradient', { id: id('rays'), x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#ffcb47'), stop(1, '#f9ad2e')),
  ],
  face: id => [
    el('path', { d: 'M99.2 49.3L110 15.1Q112 10 114 15.1L124.8 49.3ZM132.3 51.3L158.7 27.1Q163 23.7 162.1 29.1L154.4 64.1ZM159.9 69.6L194.9 61.9Q200.3 61 196.9 65.3L172.7 91.7ZM174.7 99.2L208.9 110Q214 112 208.9 114L174.7 124.8ZM172.7 132.3L196.9 158.7Q200.3 163 194.9 162.1L159.9 154.4ZM154.4 159.9L162.1 194.9Q163 200.3 158.7 196.9L132.3 172.7ZM124.8 174.7L114 208.9Q112 214 110 208.9L99.2 174.7ZM91.7 172.7L65.3 196.9Q61 200.3 61.9 194.9L69.6 159.9ZM64.1 154.4L29.1 162.1Q23.7 163 27.1 158.7L51.3 132.3ZM49.3 124.8L15.1 114Q10 112 15.1 110L49.3 99.2ZM51.3 91.7L27.1 65.3Q23.7 61 29.1 61.9L64.1 69.6ZM69.6 64.1L61.9 29.1Q61 23.7 65.3 27.1L91.7 51.3Z', fill: ref(id('rays')) }),
    el('circle', { cx: 112, cy: 112, r: 70, fill: ref(id('disc')) }),
    el('circle', { cx: 112, cy: 112, r: 68.6, fill: 'none', stroke: '#f6b73b', 'stroke-width': 2.2, 'stroke-opacity': 0.7 }),
  ],
}

const moon: StickerTemplate = {
  id: 'moon',
  label: 'Full moon',
  outline: 'M5 95A90 90 0 1 1 185 95A90 90 0 1 1 5 95Z',
  border: 7,
  bounds: [5, 5, 185, 185],
  region: { x: 9, y: 9, w: 172, h: 172 },
  clip: () => el('circle', { cx: 95, cy: 95, r: 86 }),
  inks: [{ name: 'Ink', hex: '#0c262d' }, { name: 'Teal', hex: '#0a7682' }, { name: 'Coral', hex: '#e2553b' }],
  sizes: [4, 8],
  defs: id => [
    el('radialGradient', { id: id('face'), cx: 0.38, cy: 0.34, r: 0.78 }, stop(0, '#f7f9fa'), stop(0.62, '#e4eaed'), stop(1, '#c9d3d8')),
    el('radialGradient', { id: id('crater'), cx: 0.6, cy: 0.64, r: 0.62 }, stop(0, '#cfd9dd'), stop(0.8, '#d6dfe2'), stop(1, '#eef2f4')),
  ],
  face: id => [
    el('circle', { cx: 95, cy: 95, r: 90, fill: ref(id('face')) }),
    el('path', { d: 'M52 62C62 46 86 44 98 54C108 63 100 80 86 84C70 89 44 80 52 62Z', fill: '#c3ced3', 'fill-opacity': 0.38 }),
    el('path', { d: 'M110 104C122 94 146 98 150 114C154 130 138 142 122 138C108 135 100 113 110 104Z', fill: '#c3ced3', 'fill-opacity': 0.32 }),
    el('circle', { cx: 63, cy: 124, r: 12, fill: ref(id('crater')) }),
    el('circle', { cx: 128, cy: 58, r: 8, fill: ref(id('crater')) }),
    el('circle', { cx: 100, cy: 150, r: 6, fill: ref(id('crater')) }),
    el('circle', { cx: 146, cy: 84, r: 4.5, fill: ref(id('crater')) }),
    el('circle', { cx: 42, cy: 96, r: 5, fill: ref(id('crater')) }),
  ],
}

const stamp: StickerTemplate = {
  id: 'stamp',
  label: 'Lagoon stamp',
  outline: 'M4.1 0H7.9A4.1 4.1 0 0 0 16.1 0H19.9A4.1 4.1 0 0 0 28.1 0H31.9A4.1 4.1 0 0 0 40.1 0H43.9A4.1 4.1 0 0 0 52.1 0H55.9A4.1 4.1 0 0 0 64.1 0H67.9A4.1 4.1 0 0 0 76.1 0H79.9A4.1 4.1 0 0 0 88.1 0H91.9A4.1 4.1 0 0 0 100.1 0H103.9A4.1 4.1 0 0 0 112.1 0H115.9A4.1 4.1 0 0 0 124.1 0H127.9A4.1 4.1 0 0 0 136.1 0H139.9A4.1 4.1 0 0 0 148.1 0H151.9A4.1 4.1 0 0 0 160.1 0H163.9A4.1 4.1 0 0 0 168 4.1V7.9A4.1 4.1 0 0 0 168 16.1V19.9A4.1 4.1 0 0 0 168 28.1V31.9A4.1 4.1 0 0 0 168 40.1V43.9A4.1 4.1 0 0 0 168 52.1V55.9A4.1 4.1 0 0 0 168 64.1V67.9A4.1 4.1 0 0 0 168 76.1V79.9A4.1 4.1 0 0 0 168 88.1V91.9A4.1 4.1 0 0 0 168 100.1V103.9A4.1 4.1 0 0 0 168 112.1V115.9A4.1 4.1 0 0 0 168 124.1V127.9A4.1 4.1 0 0 0 168 136.1V139.9A4.1 4.1 0 0 0 168 148.1V151.9A4.1 4.1 0 0 0 168 160.1V163.9A4.1 4.1 0 0 0 168 172.1V175.9A4.1 4.1 0 0 0 168 184.1V187.9A4.1 4.1 0 0 0 168 196.1V199.9A4.1 4.1 0 0 0 163.9 204H160.1A4.1 4.1 0 0 0 151.9 204H148.1A4.1 4.1 0 0 0 139.9 204H136.1A4.1 4.1 0 0 0 127.9 204H124.1A4.1 4.1 0 0 0 115.9 204H112.1A4.1 4.1 0 0 0 103.9 204H100.1A4.1 4.1 0 0 0 91.9 204H88.1A4.1 4.1 0 0 0 79.9 204H76.1A4.1 4.1 0 0 0 67.9 204H64.1A4.1 4.1 0 0 0 55.9 204H52.1A4.1 4.1 0 0 0 43.9 204H40.1A4.1 4.1 0 0 0 31.9 204H28.1A4.1 4.1 0 0 0 19.9 204H16.1A4.1 4.1 0 0 0 7.9 204H4.1A4.1 4.1 0 0 0 0 199.9V196.1A4.1 4.1 0 0 0 0 187.9V184.1A4.1 4.1 0 0 0 0 175.9V172.1A4.1 4.1 0 0 0 0 163.9V160.1A4.1 4.1 0 0 0 0 151.9V148.1A4.1 4.1 0 0 0 0 139.9V136.1A4.1 4.1 0 0 0 0 127.9V124.1A4.1 4.1 0 0 0 0 115.9V112.1A4.1 4.1 0 0 0 0 103.9V100.1A4.1 4.1 0 0 0 0 91.9V88.1A4.1 4.1 0 0 0 0 79.9V76.1A4.1 4.1 0 0 0 0 67.9V64.1A4.1 4.1 0 0 0 0 55.9V52.1A4.1 4.1 0 0 0 0 43.9V40.1A4.1 4.1 0 0 0 0 31.9V28.1A4.1 4.1 0 0 0 0 19.9V16.1A4.1 4.1 0 0 0 0 7.9V4.1A4.1 4.1 0 0 0 4.1 0Z',
  border: 0,
  bounds: [0, 0, 168, 204],
  region: { x: 11, y: 11, w: 146, h: 160 },
  clip: () => el('rect', { x: 11, y: 11, width: 146, height: 160 }),
  inks: [{ name: 'Ink', hex: '#0c262d' }, { name: 'Coral', hex: '#e2553b' }, { name: 'White', hex: '#ffffff' }],
  sizes: [3.5, 7],
  paper: '#fbfaf5',
  defs: id => [
    el('linearGradient', { id: id('water'), x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#b8e8de'), stop(1, '#86d3cd')),
    el('path', { id: id('ray'), d: MANTA }),
  ],
  face: id => [
    el('rect', { x: 11, y: 11, width: 146, height: 160, fill: ref(id('water')) }),
    el('path', { d: 'M11 40C34 30 52 52 78 42S122 30 157 44M11 86C30 76 58 98 84 86S126 74 157 90M11 132C40 122 60 142 92 130S134 120 157 134', fill: 'none', stroke: '#effbf5', 'stroke-width': 1.6, 'stroke-opacity': 0.6 }),
    el('use', { 'href': `#${id('ray')}`, 'fill': '#2a7e8e', 'fill-opacity': 0.45, 'transform': 'translate(106 133) scale(0.16)' }),
    el('use', { href: `#${id('ray')}`, fill: '#17222a', transform: 'translate(102 126) scale(0.16)' }),
    el('rect', { x: 11, y: 11, width: 146, height: 160, fill: 'none', stroke: '#2a8f9c', 'stroke-width': 0.8, 'stroke-opacity': 0.55 }),
    el('path', { d: 'M0.6 0V-6H1.8V-3.6H4.6V-6H5.7V0H4.6V-2.5H1.8V0ZM8.2 0V-6H9.4V0ZM11.9 0V-6H13.1L14.9 -3.4L16.6 -6H17.9V0H16.7V-4.1L14.9 -1.4L13 -4.1V0ZM19.8 0 22.1 -6H23.3L25.7 0H24.5L23.9 -1.3H21.5L21 0ZM21.9 -2.3H23.6L22.7 -4.5ZM27.6 0V-6H28.8L31.7 -2V-6H32.9V0H31.7L28.8 -4.1V0ZM37.3 0.1Q36.9 0.1 36.5 -0Q36.1 -0.1 35.8 -0.3Q35.5 -0.5 35.3 -0.8Q35.1 -1 35 -1.3L36.2 -1.6Q36.3 -1.3 36.6 -1.1Q36.9 -0.9 37.3 -0.9Q37.7 -0.9 38 -1.1Q38.3 -1.3 38.3 -1.6Q38.3 -1.9 38.1 -2.1Q37.9 -2.3 37.5 -2.4L36.7 -2.6Q36.3 -2.7 35.9 -2.9Q35.6 -3.2 35.4 -3.5Q35.2 -3.8 35.2 -4.3Q35.2 -5.1 35.8 -5.6Q36.3 -6.1 37.3 -6.1Q37.9 -6.1 38.3 -5.9Q38.8 -5.7 39.1 -5.4Q39.4 -5.1 39.5 -4.7L38.4 -4.3Q38.3 -4.6 38 -4.8Q37.7 -5 37.3 -5Q36.9 -5 36.6 -4.8Q36.4 -4.6 36.4 -4.3Q36.4 -4 36.6 -3.8Q36.8 -3.7 37.1 -3.6L37.9 -3.4Q38.7 -3.2 39.1 -2.7Q39.5 -2.3 39.5 -1.7Q39.5 -1.1 39.3 -0.7Q39 -0.3 38.5 -0.1Q38 0.1 37.3 0.1ZM41.7 0V-6H42.9V-3.6H45.6V-6H46.8V0H45.6V-2.5H42.9V0ZM51.6 0.1Q50.9 0.1 50.3 -0.2Q49.8 -0.5 49.5 -1Q49.2 -1.5 49.2 -2.2V-6H50.3V-2.2Q50.3 -1.8 50.5 -1.6Q50.7 -1.3 50.9 -1.1Q51.2 -1 51.6 -1Q52 -1 52.3 -1.1Q52.6 -1.3 52.7 -1.6Q52.9 -1.8 52.9 -2.2V-6H54V-2.2Q54 -1.5 53.7 -1Q53.4 -0.5 52.9 -0.2Q52.3 0.1 51.6 0.1ZM56.8 0.1Q56.6 0.1 56.4 -0.1Q56.2 -0.3 56.2 -0.6Q56.2 -0.8 56.4 -1Q56.6 -1.2 56.8 -1.2Q57.1 -1.2 57.3 -1Q57.5 -0.8 57.5 -0.6Q57.5 -0.3 57.3 -0.1Q57.1 0.1 56.8 0.1ZM61.7 0.1Q61.3 0.1 60.9 -0Q60.5 -0.1 60.2 -0.3Q59.9 -0.5 59.7 -0.8Q59.5 -1 59.4 -1.3L60.6 -1.6Q60.7 -1.3 61 -1.1Q61.2 -0.9 61.7 -0.9Q62.1 -0.9 62.4 -1.1Q62.7 -1.3 62.7 -1.6Q62.7 -1.9 62.5 -2.1Q62.2 -2.3 61.8 -2.4L61.1 -2.6Q60.6 -2.7 60.3 -2.9Q60 -3.2 59.8 -3.5Q59.6 -3.8 59.6 -4.3Q59.6 -5.1 60.2 -5.6Q60.7 -6.1 61.7 -6.1Q62.3 -6.1 62.7 -5.9Q63.2 -5.7 63.5 -5.4Q63.7 -5.1 63.9 -4.7L62.8 -4.3Q62.7 -4.6 62.4 -4.8Q62.1 -5 61.7 -5Q61.3 -5 61 -4.8Q60.8 -4.6 60.8 -4.3Q60.8 -4 61 -3.8Q61.2 -3.7 61.5 -3.6L62.3 -3.4Q63.1 -3.2 63.5 -2.7Q63.9 -2.3 63.9 -1.7Q63.9 -1.1 63.6 -0.7Q63.4 -0.3 62.9 -0.1Q62.4 0.1 61.7 0.1ZM66.1 0V-6H67.2V-3.6H70V-6H71.2V0H70V-2.5H67.2V0Z', fill: '#2a8f9c', transform: 'translate(48.1 191)' }),
  ],
}

// bubble, manta, sun, moon and stamp are off the board for now
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
  const paper = t.paper ?? ref(`${prefix}vinyl`)
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
