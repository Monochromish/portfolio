import { readColor } from '~/utils/color'

// contours start START px off the portrait's rim, one every GAP px, gone by REACH px
const START = 9
const GAP = 20
const REACH = 150
// each breathes SWELL px in and out, a little behind the one inside it
const SWELL = 2.5
const BREATH = 0.5
const LAG = 0.55
// a pulse leaves the rim at SPEED px a second and lifts contours within WIDTH px of its front
const SPEED = 150
const WIDTH = 60
// opacity at rest, and what a full pulse adds
const REST = 0.24
const LIFT = 0.4
const STEPS = 96
// room past the reach for the outermost contour's wander
const MARGIN = 16
// text is clear for PAD px around its block, then fades back in over about FEATHER px
const PAD = 10
const FEATHER = 22
// 30 fps is plenty for a breath this slow
const FRAME_MS = 33

interface Stage {
  ctx: CanvasRenderingContext2D
  // the canvas on the page, in CSS px
  x: number
  y: number
  w: number
  h: number
  dpr: number
  cx: number
  cy: number
  r: number
  line: string
  // wiped from every frame so text stays clear; null when no text is in reach
  calm: HTMLCanvasElement | null
  still: boolean
}

export interface FieldParts {
  // everything is measured from its top left corner
  host: HTMLElement
  field: HTMLCanvasElement
  box: HTMLElement
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const bump = (q: number) => (1 - q * q) * (1 - q * q)
// two slow waves around a contour, so it is not a circle
const wander = (a: number, t: number, k: number) => 0.6 * Math.sin(3 * a + t * 0.4 + k) + 0.4 * Math.sin(5 * a - t * 0.3 + k * 1.7)

export class ContourField {
  private stage: Stage | null = null
  private pulses: { at: number, gain: number }[] = []
  private pulsedAt = -1e9
  private raf = 0
  private last = 0
  // stops counting while paused or out of sight
  private clock = 0
  private dirty = true
  private visible = true
  private paused = false

  constructor(private readonly parts: FieldParts, private readonly reduced: boolean) {}

  start() {
    if (this.reduced) return this.draw(0)
    if (this.raf || !this.visible) return
    this.last = 0
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      const since = now - this.last
      if (since < FRAME_MS) return
      // a tab coming back from the background is not three minutes of breathing
      this.draw(this.last ? Math.min(0.1, since / 1000) : 0)
      this.last = now
    }
    this.raf = requestAnimationFrame(tick)
  }

  private stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  destroy() {
    this.stop()
  }

  relayout() {
    this.dirty = true
    if (!this.raf) this.draw(0)
  }

  setVisible(visible: boolean) {
    this.visible = visible
    if (visible) this.start()
    else this.stop()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (paused) this.pulses = []
  }

  // `every`: the shortest wait since the last pulse, in ms
  pulse(gain: number, every: number) {
    if (this.reduced || this.paused) return
    const now = performance.now()
    if (now - this.pulsedAt < every) return
    this.pulsedAt = now
    this.pulses.push({ at: this.clock, gain })
  }

  private layout() {
    const { host, field, box } = this.parts
    const frame = host.getBoundingClientRect()
    const at = box.getBoundingClientRect()
    if (!frame.width || !at.width) return
    this.dirty = false
    const r = at.width / 2
    const cx = at.left - frame.left + r
    const cy = at.top - frame.top + r
    // only as big as the contours' reach, cut off at the page's edges
    const out = r + REACH + MARGIN
    const x = Math.max(0, Math.floor(cx - out))
    const y = Math.max(0, Math.floor(cy - out))
    const w = Math.min(Math.ceil(frame.width), Math.ceil(cx + out)) - x
    const h = Math.min(Math.ceil(frame.height), Math.ceil(cy + out)) - y
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    field.width = Math.round(w * dpr)
    field.height = Math.round(h * dpr)
    field.style.left = `${x}px`
    field.style.top = `${y}px`
    field.style.width = `${w}px`
    field.style.height = `${h}px`

    // every [data-field-calm] block is kept clear, with a soft edge
    let calm: HTMLCanvasElement | null = null
    for (const el of host.querySelectorAll<HTMLElement>('[data-field-calm]')) {
      const b = el.getBoundingClientRect()
      const left = b.left - frame.left - x
      const top = b.top - frame.top - y
      if (!b.width || !b.height || left > w + FEATHER || top > h + FEATHER || left + b.width < -FEATHER || top + b.height < -FEATHER) continue
      if (!calm) {
        calm = document.createElement('canvas')
        calm.width = field.width
        calm.height = field.height
      }
      // only the block's blurred shadow lands on the canvas: the block itself is drawn off to the left, since its hard edge would show as a line
      const c = calm.getContext('2d')!
      const away = field.width + (b.width + FEATHER * 4) * dpr
      c.shadowColor = '#000'
      c.shadowBlur = FEATHER * dpr
      c.shadowOffsetX = away
      c.fillRect((left - PAD) * dpr - away, (top - PAD) * dpr, (b.width + PAD * 2) * dpr, (b.height + PAD * 2) * dpr)
    }

    const ink = readColor(host, '--ink')
    this.stage = {
      ctx: field.getContext('2d')!,
      x,
      y,
      w,
      h,
      dpr,
      cx,
      cy,
      r,
      line: `rgb(${ink & 255} ${(ink >> 8) & 255} ${(ink >> 16) & 255})`,
      calm,
      still: false,
    }
  }

  private draw(dt: number) {
    const relaid = this.dirty
    if (relaid) this.layout()
    const s = this.stage
    if (!s) return
    const breathing = !this.reduced && !this.paused
    if (breathing) this.clock += dt
    // with reduced motion the one frame drawn is a settled one
    const t = this.reduced ? 3 : this.clock
    this.pulses = this.pulses.filter(p => (t - p.at) * SPEED < REACH + WIDTH)
    // nothing moved since the last frame
    if (!breathing && s.still && !relaid) return
    s.still = !breathing
    // the contours fade up over the first 1.2 s
    const rise = this.reduced ? 1 : 1 - (1 - Math.min(1, t / 1.2)) ** 3

    const { ctx, dpr, cx, cy, r } = s
    ctx.setTransform(dpr, 0, 0, dpr, -s.x * dpr, -s.y * dpr)
    ctx.clearRect(s.x, s.y, s.w, s.h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineWidth = 1
    ctx.strokeStyle = s.line
    for (let k = 0; START + k * GAP < REACH; k++) {
      const d = START + k * GAP + SWELL * Math.sin(t * BREATH - k * LAG)
      let lift = 0
      for (const p of this.pulses) {
        const q = (d - (t - p.at) * SPEED) / WIDTH
        if (q > -1 && q < 1) lift += p.gain * bump(q)
      }
      ctx.globalAlpha = Math.min(1, (1 - smooth(40, REACH, d)) * (REST + LIFT * lift) * rise)
      // the further out, the further a contour strays from a circle
      const stray = (1.5 + d * 0.05) * (1 + 0.3 * Math.sin(t * 0.7 + k * 0.6))
      ctx.beginPath()
      for (let i = 0; i < STEPS; i++) {
        const a = i / STEPS * 2 * Math.PI
        const radius = r + d + stray * wander(a, t, k)
        ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
      }
      ctx.closePath()
      ctx.stroke()
    }
    if (s.calm) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(s.calm, 0, 0)
    }
  }
}
