import type { Ref } from 'vue'

// the wall's dots sit GAP px apart, 1 px in radius at rest
const GAP = 26
const REST = 1
const REST_ALPHA = 0.18
// ripples leave the part marked [data-wall-origin] every WAVE px, move out at SPEED px a second and are gone by REACH px
const WAVE = 150
const SPEED = 12
const REACH = 640
// what a ripple's crest adds to a dot's radius, in px, and to its opacity
const SWELL = 2.8
const LIFT = 0.55
// dots under the words stay at rest, and the ripples come back over FEATHER px past them
const FEATHER = 56
// 30 fps is plenty for a drift this slow
const FRAME_MS = 33

interface Dot {
  x: number
  y: number
  // how far along the ripples it sits, in px from where they start, with the slow stray that keeps a ripple from being a circle
  at: number
  // how much of a ripple reaches it: less with distance, none under the words
  share: number
}

export function useWallDots(wall: Ref<HTMLElement | undefined>, canvas: Ref<HTMLCanvasElement | undefined>) {
  let moving: Dot[] = []
  let rest: HTMLCanvasElement | null = null
  let ink = ''
  let dpr = 1
  let raf = 0
  let last = 0
  let clock = 0
  let visible = false
  let reduced = false
  let seen: IntersectionObserver | undefined
  let themes: MutationObserver | undefined
  let sizer: ResizeObserver | undefined

  function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fill()
  }

  // every dot the ripples never reach is drawn once and kept; only the rest are drawn each frame
  function build() {
    const el = wall.value
    const field = canvas.value
    if (!el || !field) return
    const frame = el.getBoundingClientRect()
    const w = el.clientWidth
    const h = el.clientHeight
    if (!w || !h) return
    dpr = Math.min(2, window.devicePixelRatio || 1)
    field.width = Math.round(w * dpr)
    field.height = Math.round(h * dpr)
    ink = getComputedStyle(el).getPropertyValue('--ink').trim() || '#000'

    const from = el.querySelector('[data-wall-origin]')?.getBoundingClientRect()
    const ox = from ? from.left - frame.left + from.width / 2 : 0
    const oy = from ? from.top - frame.top + from.height / 2 : 0
    const words = [...el.querySelectorAll('[data-wall-clear]')].map((part) => {
      const b = part.getBoundingClientRect()
      return { l: b.left - frame.left, t: b.top - frame.top, r: b.right - frame.left, b: b.bottom - frame.top }
    })

    rest = document.createElement('canvas')
    rest.width = field.width
    rest.height = field.height
    const still = rest.getContext('2d')!
    still.scale(dpr, dpr)
    still.fillStyle = ink
    moving = []
    for (let y = 1; y < h; y += GAP) {
      for (let x = 1; x < w; x += GAP) {
        const d = Math.hypot(x - ox, y - oy)
        const a = Math.atan2(y - oy, x - ox)
        // px to the nearest block of words; 0 inside one
        const clear = words.reduce((near, z) => Math.min(near, Math.hypot(Math.max(z.l - x, 0, x - z.r), Math.max(z.t - y, 0, y - z.b))), Infinity)
        const share = from ? Math.max(0, 1 - d / REACH) ** 1.3 * Math.min(1, clear / FEATHER) : 0
        if (share < 0.02) dot(still, x, y, REST, REST_ALPHA)
        else moving.push({ x, y, at: d + WAVE * 0.16 * (0.6 * Math.sin(3 * a + 1.2) + 0.4 * Math.sin(5 * a - 0.9)), share })
      }
    }
    draw()
    start()
  }

  function draw() {
    const field = canvas.value
    const ctx = field?.getContext('2d')
    if (!field || !ctx || !rest) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, field.width, field.height)
    ctx.drawImage(rest, 0, 0)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = ink
    for (const p of moving) {
      const crest = (0.5 + 0.5 * Math.cos((p.at - clock * SPEED) / WAVE * 2 * Math.PI)) ** 1.6 * p.share
      dot(ctx, p.x, p.y, REST + SWELL * crest, REST_ALPHA + LIFT * crest)
    }
  }

  function start() {
    if (raf || !visible || reduced || !moving.length) return
    last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const since = now - last
      if (since < FRAME_MS) return
      // a tab coming back from the background has not been rippling all that time
      clock += last ? Math.min(0.1, since / 1000) : 0
      last = now
      draw()
    }
    raf = requestAnimationFrame(tick)
  }

  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  onMounted(() => {
    const el = wall.value
    if (!el) return
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    seen = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible) start()
      else stop()
    })
    seen.observe(el)
    // the dots are drawn in the page's ink, which the theme changes
    themes = new MutationObserver(build)
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    sizer = new ResizeObserver(build)
    sizer.observe(el)
  })

  onBeforeUnmount(() => {
    stop()
    seen?.disconnect()
    themes?.disconnect()
    sizer?.disconnect()
  })

  return { rebuild: build }
}
