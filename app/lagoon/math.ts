export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const hash2 = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const noise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

const TABLE = 256
const table = new Float32Array(TABLE * TABLE)
for (let y = 0; y < TABLE; y++) {
  for (let x = 0; x < TABLE; x++) table[y * TABLE + x] = noise(x / 8, y / 8, 91) * 0.5 + noise(x / 3, y / 3, 92) * 0.5
}
export const tnoise = (x: number, y: number) => table[((Math.floor(y) & 255) << 8) | (Math.floor(x) & 255)]!

export const labelClear = (calm: number) => smooth(0.25, 0.6, calm)

export type RGB = [number, number, number]
export const hex = (h: string): RGB => [Number.parseInt(h.slice(1, 3), 16), Number.parseInt(h.slice(3, 5), 16), Number.parseInt(h.slice(5, 7), 16)]
export const pack = (c: RGB) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

export const mixPacked = (a: number, b: number, t: number) => {
  const ar = a & 255, ag = (a >>> 8) & 255, ab = (a >>> 16) & 255
  const br = b & 255, bg = (b >>> 8) & 255, bb = (b >>> 16) & 255
  return ((255 << 24) | (Math.round(ab + (bb - ab) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ar + (br - ar) * t)) >>> 0
}
