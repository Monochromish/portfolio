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

type RGB = [number, number, number]
export const hex = (h: string): RGB => [Number.parseInt(h.slice(1, 3), 16), Number.parseInt(h.slice(3, 5), 16), Number.parseInt(h.slice(5, 7), 16)]
export const pack = (c: RGB) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0
export const mixPacked = (a: number, b: number, t: number) => {
  const ar = a & 255, ag = (a >>> 8) & 255, ab = (a >>> 16) & 255
  const br = b & 255, bg = (b >>> 8) & 255, bb = (b >>> 16) & 255
  return ((255 << 24) | (Math.round(ab + (bb - ab) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ar + (br - ar) * t)) >>> 0
}
export const css = (c: number) => `#${(((c & 255) << 16) | (c & 0xFF00) | ((c >>> 16) & 255)).toString(16).padStart(6, '0')}`

// the matrices are OKLab's (Ottosson, 2020)
const linear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
const gamma = (c: number) => Math.round(clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055, 0, 1) * 255)
export function oklab(c: number) {
  const r = linear(c & 255), g = linear((c >>> 8) & 255), b = linear((c >>> 16) & 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s] as RGB
}
export function fromOklab(L: number, A: number, B: number) {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3)
  return pack([
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ])
}
export const between = (a: number, b: number, t: number) => {
  const p = oklab(a), q = oklab(b)
  return fromOklab(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t)
}
export const lighten = (c: number, dL: number) => {
  const p = oklab(c)
  return fromOklab(clamp(p[0] + dL, 0, 1), p[1], p[2])
}
