import { hex, pack, type RGB } from './math'

export interface Palette {
  water: number[]
  waterRGB: RGB[]
  light: number
  lightSoft: number
  shadow: number[]
  back: RGB[]
  marks: RGB[]
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

const build = (p: {
  water: string[], light: string, lightSoft: string, shadow: string[], back: string[], marks: string[],
  plankton: string[], glow: string[], vein: string, veinShine: string, doze: string, shadowStrength: number, causticStrength: number,
  causticCore: number, calm: string, calmLift: number,
}): Palette => ({
  water: p.water.map(c => pack(hex(c))),
  waterRGB: p.water.map(hex),
  light: pack(hex(p.light)),
  lightSoft: pack(hex(p.lightSoft)),
  shadow: p.shadow.map(c => pack(hex(c))),
  back: p.back.map(hex),
  marks: p.marks.map(hex),
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
  back: ['#04070a', '#0b1218', '#17222a', '#2b3a44'],
  marks: ['#6d838c', '#a9bbc1', '#d9e4e6', '#f2f6f4'],
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
  back: ['#03080c', '#0d1a22', '#1f3440', '#3a5564'],
  marks: ['#3c535e', '#5f7a86', '#8aa3ad', '#b2c6cc'],
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
