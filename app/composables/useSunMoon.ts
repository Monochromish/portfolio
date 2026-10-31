import type { Ref } from 'vue'

// moon to sun: the bite slides off over 110 ms, then the disk shrinks to the sun's while the rays draw clockwise from the top, over 160 ms; back to the moon: 140 ms, then the bite, 100 ms
const BITE_MS = { sun: 110, moon: 100 }
const SUN_MS = { sun: 160, moon: 140 }
// the old icons' geometry: the crescent's arcs are r 6.6 around (10.085, 9.915), the bite 5.134 away up and to the right; the sun is r 3.4 at (10, 10) with rays from r 6.2 to 7.8
const MOON = { x: 10.085, y: 9.915, r: 6.6, bite: 5.134 }
const SUN = { r: 3.4, ray: 6.2, rayLength: 1.6 }

const ease = (x: number) => 1 - (1 - x) ** 4
const unease = (y: number) => 1 - (1 - y) ** 0.25
const fixed = (n: number) => n.toFixed(3)

function crescent(x: number, y: number, r: number, d: number) {
  const h = Math.sqrt(r * r - d * d / 4)
  const mx = x + d / 2 * Math.SQRT1_2, my = y - d / 2 * Math.SQRT1_2
  const a = `${fixed(mx + h * Math.SQRT1_2)} ${fixed(my + h * Math.SQRT1_2)}`
  const b = `${fixed(mx - h * Math.SQRT1_2)} ${fixed(my - h * Math.SQRT1_2)}`
  const far = `${fixed(x - r * Math.SQRT1_2)} ${fixed(y + r * Math.SQRT1_2)}`
  const R = fixed(r)
  return `M${a}A${R} ${R} 0 0 1 ${far}A${R} ${R} 0 0 1 ${b}A${R} ${R} 0 0 0 ${a}Z`
}

const circle = (x: number, y: number, r: number) => `M${fixed(x + r)} ${fixed(y)}A${fixed(r)} ${fixed(r)} 0 1 1 ${fixed(x - r)} ${fixed(y)}A${fixed(r)} ${fixed(r)} 0 1 1 ${fixed(x + r)} ${fixed(y)}Z`

export function useSunMoon(dark: Ref<boolean>) {
  const morphing = ref(false)
  const disk = ref<SVGPathElement>()
  const rays = ref<SVGLineElement[]>([])
  let bite = 0
  let sun = 0
  let toSun = false
  let raf = 0
  let last = 0

  const shown = (x: number) => toSun ? ease(x) : 1 - ease(1 - x)
  const linear = (e: number) => toSun ? unease(e) : 1 - unease(1 - e)

  function draw() {
    const eb = shown(bite), es = shown(sun)
    const r = MOON.r - (MOON.r - SUN.r) * es
    const x = MOON.x + (10 - MOON.x) * es, y = MOON.y + (10 - MOON.y) * es
    disk.value?.setAttribute('d', eb < 1 ? crescent(x, y, r, MOON.bite + (2 * r - MOON.bite) * eb) : circle(x, y, r))
    rays.value.forEach((line, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 4, start = i * 0.07
      const k = Math.min(1, Math.max(0, (es - start) / (1 - start)))
      const c = Math.cos(angle), s = Math.sin(angle)
      line.setAttribute('x1', fixed(10 + SUN.ray * c))
      line.setAttribute('y1', fixed(10 + SUN.ray * s))
      line.setAttribute('x2', fixed(10 + (SUN.ray + SUN.rayLength * k) * c))
      line.setAttribute('y2', fixed(10 + (SUN.ray + SUN.rayLength * k) * s))
      line.style.opacity = k > 0.02 ? '1' : '0'
    })
  }

  function step(now: number) {
    const dt = now - last
    last = now
    // each phase starts once the one before is 60% through, where the quartic ease has covered 97% of it
    if (toSun) {
      bite = Math.min(1, bite + dt / BITE_MS.sun)
      if (bite > 0.6) sun = Math.min(1, sun + dt / SUN_MS.sun)
    }
    else {
      sun = Math.max(0, sun - dt / SUN_MS.moon)
      if (sun < 0.4) bite = Math.max(0, bite - dt / BITE_MS.moon)
    }
    draw()
    if (toSun ? sun >= 1 : bite <= 0) morphing.value = false
    else raf = requestAnimationFrame(step)
  }

  function go(next: boolean) {
    const eb = shown(bite), es = shown(sun)
    toSun = next
    bite = linear(eb)
    sun = linear(es)
    cancelAnimationFrame(raf)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      bite = sun = next ? 1 : 0
      morphing.value = false
      return
    }
    morphing.value = true
    last = performance.now()
    draw()
    raf = requestAnimationFrame(step)
  }

  onMounted(() => {
    toSun = dark.value
    bite = sun = dark.value ? 1 : 0
    watch(dark, go)
  })

  onBeforeUnmount(() => cancelAnimationFrame(raf))

  return { morphing, disk, rays }
}
