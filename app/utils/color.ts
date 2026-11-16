// packed ABGR, read through a canvas so any CSS colour syntax works
export function readColor(el: Element, name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const probe = canvas.getContext('2d', { willReadFrequently: true })!
  probe.fillStyle = getComputedStyle(el).getPropertyValue(name).trim()
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return ((255 << 24) | (b! << 16) | (g! << 8) | r!) >>> 0
}
