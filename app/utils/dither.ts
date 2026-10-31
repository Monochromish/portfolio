const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]

export const bayer = (x: number, y: number) => (BAYER8[(y & 7) * 8 + (x & 7)]! + 0.5) / 64

export function readColor(el: Element, name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const probe = canvas.getContext('2d', { willReadFrequently: true })!
  probe.fillStyle = getComputedStyle(el).getPropertyValue(name).trim()
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return ((255 << 24) | (b! << 16) | (g! << 8) | r!) >>> 0
}

// over 1 so `deep` is whole a little above the last row
const RAMP = 1.15
export function rampFill(inside: Uint8Array, cols: number, rows: number, deep: number, light: number) {
  const fill = new Uint32Array(cols * rows)
  for (let y = 0; y < rows; y++) {
    const ramp = (y + 0.5) / rows * RAMP
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      if (inside[i]) fill[i] = ramp > bayer(x, y) ? deep : light
    }
  }
  return fill
}
