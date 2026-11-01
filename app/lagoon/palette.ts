import { between, css, hex, lighten, mixPacked, oklab, pack } from './math'

export interface Palette {
  water: number[]
  light: number
  lightSoft: number
  // per sink step, the two shadow tones
  shadow: Uint32Array[]
  // per depth level: 0 unused, 1 to 5 the body from darkest, 6 to 8 the marks, 9 the glint, 10 the rim
  skin: Uint32Array[]
  plankton: number[]
  glow: number[]
  vein: number
  veinShine: number
  doze: number
  // by night a shadow mixes the water under it this far toward its tone, deep and pale; by day it is the tones themselves
  shadowMix: number[]
  causticStrength: number
  // how much of the caustic core is lit
  causticCore: number
  // under text the water moves toward this tone by calmLift
  calm: number
  calmLift: number
  // the water's own tone, which a sinking body walks toward
  sink: number
  // OKLab lightness a letter moves from its tile on the skin and on the marks, and a seam below its tile
  ink: number[]
  // how much further the mosaic's skin tones spread from the base tone in lightness
  spread: number
}

export const DEPTHS = 7
// each depth level moves the body 0.04 of the way to the veil, and its marks, glint and rim 0.7 as far
const VEIL_STEP = 0.04
// steps from a body toward its sink tone; past the last one it has sunk into the water
export const SINKS = 12

function sinking(colors: number[], sink: number) {
  return Array.from({ length: SINKS }, (_, step) => Uint32Array.from(colors.map(c => c && mixPacked(c, sink, step / SINKS))))
}

function skin(body: string[], marks: string[], glint: string, rim: string, veil: string) {
  const to = pack(hex(veil))
  const all = [...body, ...marks, glint, rim].map(c => pack(hex(c)))
  return Array.from({ length: DEPTHS }, (_, level) => {
    const k = level * VEIL_STEP
    return Uint32Array.from([0, ...all.map((c, i) => mixPacked(c, to, i < body.length ? k : k * 0.7))])
  })
}

const build = (p: {
  water: string[], light: string, lightSoft: string, shadow: string[], body: string[], marks: string[], glint: string, rim: string, veil: string,
  sink: string, plankton: string[], glow: string[], vein: string, veinShine: string, doze: string, shadowMix: number[],
  causticStrength: number, causticCore: number, calm: string, calmLift: number, ink: number[], spread: number,
}): Palette => ({
  water: p.water.map(c => pack(hex(c))),
  light: pack(hex(p.light)),
  lightSoft: pack(hex(p.lightSoft)),
  shadow: sinking(p.shadow.map(c => pack(hex(c))), pack(hex(p.sink))),
  skin: skin(p.body, p.marks, p.glint, p.rim, p.veil),
  plankton: p.plankton.map(c => pack(hex(c))),
  glow: p.glow.map(c => pack(hex(c))),
  vein: pack(hex(p.vein)),
  veinShine: pack(hex(p.veinShine)),
  doze: pack(hex(p.doze)),
  shadowMix: p.shadowMix,
  causticStrength: p.causticStrength,
  causticCore: p.causticCore,
  calm: pack(hex(p.calm)),
  calmLift: p.calmLift,
  sink: pack(hex(p.sink)),
  ink: p.ink,
  spread: p.spread,
})

export const DAY = build({
  water: ['#3ca3b2', '#57b9bf', '#7bcfcb', '#a3dfd5'],
  light: '#ecfbf3',
  lightSoft: '#bfe9de',
  shadow: ['#2a7e8e', '#33909e'],
  body: ['#0a0b1b', '#131a2f', '#1a293b', '#223c47', '#31575c'],
  marks: ['#4d6d7c', '#7b9ba4', '#b3cccb'],
  glint: '#e3f2ec',
  rim: '#131a2f',
  veil: '#3ca3b2',
  sink: '#57b9bf',
  plankton: ['#ec7a64', '#ffb8a3'],
  glow: ['#f4fff6', '#d7f3e6', '#a3dfd5'],
  vein: '#e2233f',
  veinShine: '#ffc6d0',
  doze: '#ecfbf3',
  shadowMix: [],
  causticStrength: 1,
  causticCore: 1,
  calm: '#c4ebe0',
  calmLift: 0.6,
  ink: [0.05, 0.08, 0.03],
  spread: 0.25,
})

export const NIGHT = build({
  water: ['#051019', '#081823', '#0b202e', '#0f2a3a'],
  light: '#2c5668',
  lightSoft: '#163646',
  shadow: ['#040c13', '#061219'],
  body: ['#02060a', '#060d13', '#0b151d', '#16242f', '#3d5a6b'],
  marks: ['#2b3a45', '#45596a', '#6c8590'],
  glint: '#a9c4cc',
  rim: '#2f424e',
  veil: '#0f2a3a',
  sink: '#081823',
  plankton: ['#5fe3d0', '#c8fff4'],
  glow: ['#e9fffb', '#8ff3e3', '#3fb7aa', '#1c5f5c'],
  vein: '#ff5468',
  veinShine: '#ffd0d8',
  doze: '#bfe3ea',
  shadowMix: [0.55, 0.3],
  causticStrength: 0.22,
  causticCore: 0.3,
  calm: '#06121b',
  calmLift: 0.6,
  ink: [0.035, 0.07, 0.025],
  spread: 0,
})

// The mosaic's tiles. Per depth level: the skin's five tones with three steps between each pair (17 from the darkest to
// the highlight), the marks' three the same way (9), and the 30 tiles a skin tone and a mark share by a third or two.
// Every face carries its tile, its seam and its letter's ink pressed light, even and hard
export const SUB = 4
export const SKIN_STEPS = 4 * SUB + 1, MARK_STEPS = 2 * SUB + 1
export const MARK_AT = SKIN_STEPS, BLEND_AT = SKIN_STEPS + MARK_STEPS
// past the blends, the anger mark's red and its shine
export const VEIN_AT = BLEND_AT + 30
export const FACES = VEIN_AT + 2
export const PARTS = 5
const PRESS = [0.65, 1, 1.35]

export interface Tiles {
  packed: Uint32Array
  css: string[]
  rim: number
  // the colour id past the faces where the eye's catchlight starts, one a depth level
  glint: number
  sink: string
}

function ladder(tones: number[]) {
  const out: number[] = []
  for (let i = 0; i < tones.length - 1; i++) for (let k = 0; k < SUB; k++) out.push(between(tones[i]!, tones[i + 1]!, k / SUB))
  out.push(tones[tones.length - 1]!)
  return out
}

const built = new WeakMap<object, Tiles>()
export function tilesOf(pal: Palette) {
  let t = built.get(pal.skin)
  if (t) return t
  const [skinInk, markInk, seamInk] = pal.ink as [number, number, number]
  const n = DEPTHS * FACES * PARTS
  const packed = new Uint32Array(n + DEPTHS)
  for (let level = 0; level < DEPTHS; level++) {
    const sk = pal.skin[level]!
    const base = oklab(sk[3]!)[0], spread = (c: number) => lighten(c, (oklab(c)[0] - base) * pal.spread)
    const skin = ladder([spread(sk[1]!), spread(sk[2]!), sk[3]!, spread(sk[4]!), spread(sk[5]!)]), marks = ladder([sk[6]!, sk[7]!, sk[8]!])
    const faces = [...skin, ...marks]
    for (let s = 0; s < 5; s++) for (let m = 0; m < 3; m++) for (const share of [1 / 3, 2 / 3]) faces.push(between(skin[s * SUB]!, marks[m * SUB]!, share))
    faces.push(pal.vein, pal.veinShine)
    faces.forEach((c, f) => {
      const o = (level * FACES + f) * PARTS
      // on the skin a letter lifts its tile more the more light the tile holds
      const dL = f < MARK_AT ? skinInk * (0.6 + 0.4 * f / (SKIN_STEPS - 1)) : f < BLEND_AT || f >= VEIN_AT || oklab(c)[0] > 0.5 ? -markInk : skinInk
      packed[o] = c
      packed[o + 1] = lighten(c, -seamInk)
      for (let k = 0; k < 3; k++) packed[o + 2 + k] = lighten(c, dL * PRESS[k]!)
    })
    packed[n + level] = sk[9]!
  }
  const rimL = oklab(pal.skin[0]![10]!)[0]
  let rim = 0
  for (let k = 1; k < SKIN_STEPS; k++) {
    if (Math.abs(oklab(packed[k * PARTS]!)[0] - rimL) < Math.abs(oklab(packed[rim * PARTS]!)[0] - rimL)) rim = k
  }
  t = { packed, css: Array.from(packed, css), rim, glint: n, sink: css(pal.sink) }
  built.set(pal.skin, t)
  return t
}
