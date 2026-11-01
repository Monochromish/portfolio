import { hex, mixPacked, pack } from './math'

export interface Palette {
  water: number[]
  light: number
  lightSoft: number
  // per sink step, the two shadow tones
  shadow: Uint32Array[]
  // per depth level and sink step: 0 unused, 1 to 5 the body from darkest, 6 to 8 the marks, 9 the glint, 10 the rim
  skin: Uint32Array[][]
  // the slot each skin slot takes in the shadow of a shallower animal
  shade: Uint8Array
  plankton: number[]
  glow: number[]
  vein: number
  veinShine: number
  doze: number
  shadowStrength: number
  causticStrength: number
  // how much of the caustic core is lit
  causticCore: number
  // under text the water moves toward this tone by calmLift
  calm: number
  calmLift: number
}

export const DEPTHS = 7
// each depth level moves the body 0.04 of the way to the veil, and its marks, glint and rim 0.7 as far
const VEIL_STEP = 0.04
// steps from a body toward its sink tone; past the last one it has sunk into the water
export const SINKS = 12

function sinking(colors: number[], sink: number) {
  return Array.from({ length: SINKS }, (_, step) => Uint32Array.from(colors.map(c => c && mixPacked(c, sink, step / SINKS))))
}

function skin(body: string[], marks: string[], glint: string, rim: string, veil: string, sink: number) {
  const to = pack(hex(veil))
  const all = [...body, ...marks, glint, rim].map(c => pack(hex(c)))
  return Array.from({ length: DEPTHS }, (_, level) => {
    const k = level * VEIL_STEP
    return sinking([0, ...all.map((c, i) => mixPacked(c, to, i < body.length ? k : k * 0.7))], sink)
  })
}

const build = (p: {
  water: string[], light: string, lightSoft: string, shadow: string[], body: string[], marks: string[], glint: string, rim: string, veil: string,
  sink: string, shade: number[], plankton: string[], glow: string[], vein: string, veinShine: string, doze: string, shadowStrength: number,
  causticStrength: number, causticCore: number, calm: string, calmLift: number,
}): Palette => ({
  water: p.water.map(c => pack(hex(c))),
  light: pack(hex(p.light)),
  lightSoft: pack(hex(p.lightSoft)),
  shadow: sinking(p.shadow.map(c => pack(hex(c))), pack(hex(p.sink))),
  skin: skin(p.body, p.marks, p.glint, p.rim, p.veil, pack(hex(p.sink))),
  shade: Uint8Array.from(p.shade),
  plankton: p.plankton.map(c => pack(hex(c))),
  glow: p.glow.map(c => pack(hex(c))),
  vein: pack(hex(p.vein)),
  veinShine: pack(hex(p.veinShine)),
  doze: pack(hex(p.doze)),
  shadowStrength: p.shadowStrength,
  causticStrength: p.causticStrength,
  causticCore: p.causticCore,
  calm: pack(hex(p.calm)),
  calmLift: p.calmLift,
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
  shade: [0, 1, 1, 1, 2, 3, 3, 4, 5, 6, 1],
  plankton: ['#ec7a64', '#ffb8a3'],
  glow: ['#f4fff6', '#d7f3e6', '#a3dfd5'],
  vein: '#e2233f',
  veinShine: '#ffc6d0',
  doze: '#ecfbf3',
  shadowStrength: 1,
  causticStrength: 1,
  causticCore: 1,
  calm: '#c4ebe0',
  calmLift: 0.6,
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
  shade: [0, 1, 1, 2, 3, 4, 4, 6, 10, 7, 4],
  plankton: ['#5fe3d0', '#c8fff4'],
  glow: ['#e9fffb', '#8ff3e3', '#3fb7aa', '#1c5f5c'],
  vein: '#ff5468',
  veinShine: '#ffd0d8',
  doze: '#bfe3ea',
  shadowStrength: 0.35,
  causticStrength: 0.22,
  causticCore: 0.3,
  calm: '#06121b',
  calmLift: 0.6,
})
