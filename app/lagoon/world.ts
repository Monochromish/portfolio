import { bayer } from '../utils/dither'
import { release } from './body'
import { DOZE, FACE_X, FACE_Y, MASKS } from './face'
import { Manta, type Patch, type Senses } from './manta'
import { clamp, hash2, labelClear, mixPacked, seeded, smooth, tnoise } from './math'
import { DEEP, Mosaic } from './mosaic'
import { DAY, NIGHT, SINKS, type Palette } from './palette'

interface Grain { x: number, y: number, vx: number, vy: number, hx: number, hy: number, dart: number, life: number, glow: number, patch: Patch }
interface Ripple { x: number, y: number, t: number, scale: number }

const STEP = 1 / 60
const VORONOI = 30
// how far the calm of a paragraph reaches, in cells
const TEXT_REACH = 26
const PHONE_TEXT_REACH = 16
// [x, y, size, heading]
const PHONE_LAYOUT = [[0.64, 0.19, 0.32, -2.6], [0.24, 0.24, 0.24, -0.25]]

function labelBoxes(el: Element) {
  const boxes: DOMRect[] = []
  const range = document.createRange()
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (!node.textContent?.trim() || node.parentElement?.closest('.sr-only')) continue
    range.selectNodeContents(node)
    boxes.push(...range.getClientRects())
  }
  for (const icon of el.querySelectorAll('[class*="i-site-"], svg')) boxes.push(...icon.getClientRects())
  return boxes.map(r => new DOMRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4))
}
const MAX_CELLS = 105_000
const RIPPLE_S = 1.1
const MEMORY_KEY = 'lagoon'

export interface LagoonOptions {
  night: boolean
  reduced: boolean
  tiles: HTMLCanvasElement
  onTop?: (color: string, night: boolean) => void
  onSplash?: () => void
}

export class Lagoon {
  private ctx: CanvasRenderingContext2D
  private W = 0
  private H = 0
  private K = 1
  private dpr = 1
  private cellCss = 4
  private frame!: ImageData
  private fb!: Uint32Array
  private base!: Uint32Array
  private ground!: Uint32Array
  private deepBase!: Uint32Array
  private deepGround!: Uint32Array
  private mod!: Float32Array
  private mosaic: Mosaic
  private eHalf = new Float32Array(0)
  private hw = 0
  private hh = 0
  private fx = new Float32Array(0)
  private fy = new Float32Array(0)
  private gw = 0
  private warpX = new Float32Array(0)
  private warpY = new Float32Array(0)
  private warpSum = new Float32Array(0)
  private warpDiff = new Float32Array(0)
  private frameMs = 0
  private freshMs = 0
  private offer = 0
  private half = false
  private slowFor = 0
  private fastFor = 0
  private skip = false
  private drawnT = 0
  private calm!: Float32Array
  private calmText!: Float32Array
  private calmChrome!: Float32Array
  private avoid: Senses['avoid'] = []
  private pal: Palette
  private night: boolean
  private mantas: Manta[] = []
  private sizes: number[] = []
  private patches: Patch[] = []
  private grains: Grain[] = []
  private ripples: Ripple[] = []
  private nextNap = 0
  private ceiling = 0
  private t = 0
  private acc = 0
  private last = 0
  private raf = 0
  private running = false
  private visible = true
  private paused = false
  private rand = seeded(Math.floor(Math.random() * 1e9))
  private pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, still: 0, speed: 0, fine: true, active: false, overText: false }
  private drift = { x: 1.2, y: -0.6 }
  private samples: { x: number, y: number, t: number }[] = []
  private speeds: number[] = []
  private threat = 200
  private tolerance = 0
  private light: number[]
  private calmEls: Element[] = []
  private ro: ResizeObserver
  private ratio: MediaQueryList | null = null
  private calmTimer = 0
  private onTop?: (color: string, night: boolean) => void
  private onSplash?: () => void

  constructor(private canvas: HTMLCanvasElement, private host: HTMLElement, opts: LagoonOptions) {
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.mosaic = new Mosaic(opts.tiles)
    this.onTop = opts.onTop
    this.onSplash = opts.onSplash
    this.night = opts.night
    this.nextNap = 15 + this.rand() * 20
    this.pal = opts.night ? NIGHT : DAY
    const l = [-0.45, -0.55, 0.7], n = Math.hypot(...l)
    this.light = l.map(v => v / n)
    this.recall()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.watchRatio()
    this.resize()
    this.populate()
    if (opts.reduced) for (let i = 0; i < 60 * 3; i++) this.step(STEP)
    this.draw()
  }

  private recall() {
    let visits = 0
    try {
      const raw = localStorage.getItem(MEMORY_KEY)
      if (raw) {
        const m = JSON.parse(raw) as { visits?: number, tolerance?: number }
        visits = m.visits ?? 0
        this.tolerance = clamp(m.tolerance ?? 0, 0, 0.6)
      }
      localStorage.setItem(MEMORY_KEY, JSON.stringify({ visits: visits + 1, tolerance: this.tolerance }))
    }
    catch {
      this.tolerance = 0
    }
  }

  private remember() {
    try {
      const raw = localStorage.getItem(MEMORY_KEY)
      const m = raw ? JSON.parse(raw) as { visits?: number } : {}
      localStorage.setItem(MEMORY_KEY, JSON.stringify({ visits: m.visits ?? 1, tolerance: this.tolerance }))
    }
    catch {
    }
  }

  private resize() {
    const r = this.host.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    this.dpr = window.devicePixelRatio || 1
    const sw = window.screen.width, sh = window.screen.height
    this.cellCss = Math.max(sw < 640 ? 3 : 4, Math.min(10, Math.round(Math.sqrt(Math.max(sw * sh, r.width * r.height) / MAX_CELLS))))
    this.K = Math.max(2, Math.round(this.cellCss * this.dpr))
    const W = Math.ceil(r.width * this.dpr / this.K), H = Math.ceil(r.height * this.dpr / this.K)
    if (W === this.W && H === this.H && this.canvas.width === W) {
      const sized = this.mosaic.resize(W, H, this.K, this.dpr)
      this.measureCalm()
      if (sized) this.draw()
      return
    }
    if (this.W && this.H) {
      const kx = W / this.W, ky = H / this.H
      for (const o of [...this.mantas, ...this.patches, ...this.grains, ...this.ripples]) {
        o.x *= kx
        o.y *= ky
      }
    }
    this.W = W
    this.H = H
    this.canvas.width = W
    this.canvas.height = H
    this.canvas.style.width = `${W * this.K / this.dpr}px`
    this.canvas.style.height = `${H * this.K / this.dpr}px`
    this.frame = this.ctx.createImageData(W, H)
    this.fb = new Uint32Array(this.frame.data.buffer)
    this.base = new Uint32Array(W * H)
    this.ground = new Uint32Array(W * H)
    this.deepBase = new Uint32Array(W * H)
    this.deepGround = new Uint32Array(W * H)
    this.mod = new Float32Array(W * H)
    this.mosaic.resize(W, H, this.K, this.dpr)
    this.calm = new Float32Array(W * H)
    this.calmText = new Float32Array(W * H)
    this.calmChrome = new Float32Array(W * H)
    this.hw = Math.ceil(W / 2) + 2
    this.hh = Math.ceil(H / 2) + 2
    this.eHalf = new Float32Array(this.hw * this.hh)
    this.gw = Math.ceil(W / VORONOI) + 4
    const gh = Math.ceil(H / VORONOI) + 4
    this.fx = new Float32Array(this.gw * gh)
    this.fy = new Float32Array(this.gw * gh)
    this.warpX = new Float32Array(H + 2)
    this.warpY = new Float32Array(W + 2)
    this.warpSum = new Float32Array(W + H + 2)
    this.warpDiff = new Float32Array(W + H + 2)
    const unit = Math.min(W, H)
    this.mantas.forEach((m, i) => { m.targetL = Math.round(clamp(unit * this.sizes[i]!, 18, 90)) })
    this.paintBase()
    this.measureCalm()
    this.draw()
  }

  private paintBase() {
    const { W, H, pal } = this
    for (let y = 0; y < H; y++) {
      const depth = y / H
      for (let x = 0; x < W; x++) {
        const th = bayer(x, y)
        const g = clamp((this.night ? 0.95 - depth * 0.75 : 1.05 - depth * 0.85) + 0.22 * tnoise(x * 0.16, y * 0.16), 0, 1) * 3
        const i = Math.floor(g), f = g - i
        const k = Math.min(3, i + (f > th ? 1 : 0))
        const idx = y * W + x
        this.base[idx] = pal.water[k]!
        this.deepBase[idx] = pal.water[Math.max(0, k - 1)]!
        this.mod[idx] = (0.75 + 0.25 * (1 - depth)) * (0.65 + 0.35 * tnoise(x * 0.3, y * 0.3))
      }
    }
  }

  private measureCalm() {
    const { W, H } = this
    this.calmEls = [...document.querySelectorAll('[data-lagoon-calm]')]
    const soft = this.calmEls.map(el => el.getAttribute('data-lagoon-calm') === 'light')
    const box = this.canvas.getBoundingClientRect()
    const toCell = this.dpr / this.K
    const cells = (r: DOMRect, label: boolean) => ({ x0: (r.left - box.left) * toCell, y0: (r.top - box.top) * toCell, x1: (r.right - box.left) * toCell, y1: (r.bottom - box.top) * toCell, soft: label })
    const some = (a: { x0: number, y0: number, x1: number, y1: number }) => a.x1 > a.x0 && a.y1 > a.y0
    this.avoid = this.calmEls.map((el, i) => cells(el.getBoundingClientRect(), soft[i]!)).filter(some)
    // the header's labels are the soft rects in the top fifth; its bar ends about 24 px below them
    this.ceiling = Math.max(0, ...this.avoid.filter(a => a.soft && a.y0 < H * 0.2).map(a => a.y1 + 24 / this.cellCss))
    const rects = this.calmEls.flatMap((el, i) => soft[i] ? labelBoxes(el).map(r => cells(r, true)) : [cells(el.getBoundingClientRect(), false)]).filter(some)
    this.calm.fill(0)
    this.calmText.fill(0)
    this.calmChrome.fill(0)
    for (const a of rects) {
      const own = a.soft ? this.calmChrome : this.calmText
      const peak = a.soft ? 0.72 : 0.9, reach = a.soft ? 4 : W * this.cellCss < 640 ? PHONE_TEXT_REACH : TEXT_REACH, pad = reach + 12
      const x0 = Math.max(0, Math.floor(a.x0 - pad)), x1 = Math.min(W - 1, Math.ceil(a.x1 + pad))
      const y0 = Math.max(0, Math.floor(a.y0 - pad)), y1 = Math.min(H - 1, Math.ceil(a.y1 + pad))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = Math.max(a.x0 - x, 0, x - a.x1), dy = Math.max(a.y0 - y, 0, y - a.y1)
          const out = Math.hypot(dx, dy)
          const d = out + (a.soft ? (tnoise(x * 0.6, y * 0.6) - 0.5) * 6 * smooth(0, 3, out) : (tnoise(x * 0.11, y * 0.11) - 0.5) * 10 * smooth(0, 8, out))
          const v = (1 - smooth(-4, reach, d - 6)) * peak
          const i = y * W + x
          if (v > this.calm[i]!) this.calm[i] = v
          if (v > own[i]!) own[i] = v
        }
      }
    }
    this.mosaic.measure(this.calmText, this.calmChrome)
    this.paintGround()
  }

  private paintGround() {
    const { base, deepBase, calm, ground, deepGround, pal } = this
    for (let i = 0; i < ground.length; i++) {
      const q = calm[i]!
      ground[i] = q > 0.004 ? mixPacked(base[i]!, pal.calm, Math.min(1, q / 0.9) * pal.calmLift) : base[i]!
      deepGround[i] = q > 0.004 ? mixPacked(deepBase[i]!, pal.calm, Math.min(1, q / 0.9) * pal.calmLift) : deepBase[i]!
    }
    const rows = Math.min(this.H, 6)
    let r = 0, g = 0, b = 0
    for (let i = 0; i < this.W * rows; i++) {
      const c = ground[i]!
      r += c & 255
      g += (c >>> 8) & 255
      b += (c >>> 16) & 255
    }
    const n = Math.max(1, this.W * rows)
    const to = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
    this.onTop?.(`#${to(r)}${to(g)}${to(b)}`, this.night)
  }

  private populate() {
    const { W, H, rand } = this
    const phone = W * this.cellCss < 640
    const unit = Math.min(W, H)
    const layout = phone
      ? PHONE_LAYOUT
      : [[0.66, 0.4, 0.33, 2.75], [0.27, 0.19, 0.2, -0.45], [0.94, 0.9, 0.2, -2.3]]
    layout.forEach(([fx, fy, size, hd], i) => {
      this.sizes[i] = size! * (0.92 + rand() * 0.16)
      const L = Math.round(clamp(unit * this.sizes[i]!, 18, 90))
      const m = new Manta(
        i + 1, L, 1.05 + rand() * 0.13, fx! * W, fy! * H, hd! + (rand() - 0.5) * 0.4,
        clamp(0.35 + rand() * 0.6 + this.tolerance * 0.3, 0, 1), 0.4 + rand() * 0.6, rand,
      )
      this.arrive(m)
      this.mantas.push(m)
    })
  }

  // floor: above the 64px lip of the sheet
  private arrive(m: Manta) {
    const { W, H } = this
    const floor = H - 64 / this.cellCss
    const rim = m.rim()
    const shows = (x: number, y: number, c: number, s: number) => {
      let inside = 0, calm = 0
      for (const [a, w] of rim) {
        const bx = x + c * a - s * w, by = y + s * a + c * w
        if (bx < 0 || by < 0 || bx >= W || by >= floor) continue
        inside++
        const i = Math.floor(by) * W + Math.floor(bx)
        calm = Math.max(calm, this.calmText[i]!, this.calmChrome[i]! * 0.4)
      }
      // a body starts to sink once any of it is over calm of 0.35 (Manta.raster)
      return inside / rim.length * (1 - smooth(0.2, 0.35, calm))
    }
    const { x: px, y: py, heading: want, L } = m
    let top = -Infinity
    for (const turn of [0, 0.6, -0.6, 1.3, -1.3, Math.PI]) {
      const heading = want + turn, c = Math.cos(heading), s = Math.sin(heading)
      for (let gy = 0.05; gy < 0.96; gy += 0.04) {
        for (let gx = 0.05; gx < 0.96; gx += 0.04) {
          const x = gx * W, y = gy * H
          const now = shows(x, y, c, s)
          if (now < 0.5) continue
          const later = Math.min(shows(x + c * 1.2 * L, y + s * 1.2 * L, c, s), shows(x + c * 2.4 * L, y + s * 2.4 * L, c, s))
          const apart = this.mantas.reduce((d, o) => Math.min(d, Math.hypot(o.x - x, o.y - y) / (o.L + L)), 1)
          const score = 3 * now + 2 * later + 1.5 * apart - Math.hypot(x - px, y - py) / Math.max(W, H) - 0.15 * Math.abs(turn)
          if (score > top) {
            top = score
            m.x = x
            m.y = y
            m.heading = heading
          }
        }
      }
    }
  }

  setNight(night: boolean) {
    if (night === this.night) return
    this.night = night
    this.pal = night ? NIGHT : DAY
    if (night) this.nextNap = this.t + 15 + this.rand() * 20
    this.paintBase()
    this.paintGround()
    if (!this.running) this.draw()
    else {
      this.acc = Math.max(this.acc, STEP)
      this.skip = true
    }
  }

  setVisible(v: boolean) {
    this.visible = v
    this.sync()
  }

  setPaused(p: boolean) {
    this.paused = p
    this.sync()
  }

  private sync() {
    const should = this.visible && !this.paused && document.visibilityState === 'visible'
    if (should && !this.running) {
      this.running = true
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
    else if (!should && this.running) {
      this.running = false
      cancelAnimationFrame(this.raf)
      this.draw()
    }
  }

  start() {
    document.addEventListener('visibilitychange', this.onVisibility)
    this.sync()
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    clearTimeout(this.calmTimer)
    this.ro.disconnect()
    this.ratio?.removeEventListener('change', this.onRatio)
    this.mosaic.destroy()
    release()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.remember()
  }

  private onVisibility = () => this.sync()

  private watchRatio() {
    this.ratio?.removeEventListener('change', this.onRatio)
    this.ratio = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    this.ratio.addEventListener('change', this.onRatio)
  }

  private onRatio = () => {
    this.watchRatio()
    this.resize()
  }

  relayout() {
    clearTimeout(this.calmTimer)
    this.calmTimer = window.setTimeout(() => { this.measureCalm(); if (!this.running) this.draw() }, 120)
  }

  private toCell(clientX: number, clientY: number) {
    const box = this.canvas.getBoundingClientRect()
    return { x: (clientX - box.left) * this.dpr / this.K, y: (clientY - box.top) * this.dpr / this.K }
  }

  // velocity averages roughly the last 1/24 s of samples
  move(clientX: number, clientY: number, fine: boolean) {
    const p = this.toCell(clientX, clientY)
    const now = performance.now()
    const lastSample = this.samples[this.samples.length - 1]
    if (lastSample && now - lastSample.t > 100) {
      this.samples.length = 0
      this.pointer.vx = 0
      this.pointer.vy = 0
    }
    this.samples.push({ x: p.x, y: p.y, t: now })
    while (this.samples.length > 2 && now - this.samples[0]!.t > 42) this.samples.shift()
    const a = this.samples[0]!, b = this.samples[this.samples.length - 1]!
    const dt = (b.t - a.t) / 1000
    if (dt > 0.004) {
      this.pointer.vx = (b.x - a.x) / dt
      this.pointer.vy = (b.y - a.y) / dt
    }
    const speed = Math.hypot(this.pointer.vx, this.pointer.vy)
    this.pointer.x = p.x
    this.pointer.y = p.y
    this.pointer.overText = this.avoid.some(r => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1)
    this.pointer.fine = fine
    this.pointer.active = true
    this.pointer.speed = speed
    if (speed > 2) this.pointer.still = 0
    if (fine && speed > 4) {
      this.speeds.push(speed)
      if (this.speeds.length > 240) this.speeds.shift()
    }
  }

  leave() {
    this.pointer.active = false
  }

  feed(clientX: number, clientY: number) {
    const p = this.toCell(clientX, clientY)
    if (p.x < 0 || p.y < 0 || p.x >= this.W || p.y >= this.H) return
    const refuse = this.W * this.cellCss < 400 ? 0.6 : 0.3
    if (this.calm[Math.floor(p.y) * this.W + Math.floor(p.x)]! > refuse) return
    const patch: Patch = { x: p.x, y: p.y, born: this.t, light: this.night, density: 0, dir: this.rand() < 0.5 ? -1 : 1 }
    this.patches.push(patch)
    this.ripples.push({ x: p.x, y: p.y, t: this.t, scale: 1 }, { x: p.x, y: p.y, t: this.t + 0.18, scale: 0.62 })
    const n = this.night ? 110 : 90
    const r = Math.min(this.W, this.H) * 0.085 * (this.night ? 2.4 : 1)
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2, d = r * 0.5 * Math.sqrt(-2 * Math.log(1 - this.rand() * 0.98))
      this.grains.push({
        x: p.x, y: p.y, vx: Math.cos(a) * d * 1.3, vy: Math.sin(a) * d * 1.3 * 0.8, hx: Math.cos(a), hy: Math.sin(a),
        dart: this.rand() * 1.5, life: 26 + this.rand() * 14, glow: this.night ? 1 : 0, patch,
      })
    }
    if (this.patches.length > 4) {
      const old = this.patches.shift()!
      this.grains = this.grains.filter(g => g.patch !== old)
    }
    if (!this.running) this.draw()
  }

  provoke(clientX: number, clientY: number) {
    if (this.mantas.some(m => m.madAt >= 0)) return
    const p = this.toCell(clientX, clientY)
    const near = this.mantas.filter(m => m.x > 0 && m.x < this.W && m.y > this.ceiling && m.y < this.H)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
    near.forEach((m, i) => {
      // the mouth stops 60 px left of the switch, 1.3 body lengths under the header or halfway to the text below it, whichever is higher
      const x = clamp(p.x - 60 / this.cellCss, m.L * 1.2, this.W - m.L * 1.2)
      const floor = Math.min(this.H, ...this.avoid.filter(a => !a.soft && a.x1 > x - m.L && a.x0 < x + m.L).map(a => a.y0))
      const y = Math.min(this.ceiling + 1.3 * m.L, (this.ceiling + floor) / 2)
      m.provoke(this.t + 0.15 + i * 0.9 + this.rand() * 0.2, x, y, p.x, p.y)
    })
  }

  private step(dt: number) {
    this.t += dt
    const p = this.pointer
    if (p.speed < 2 && p.active) p.still += dt
    const decay = Math.exp(-dt * 6)
    p.vx *= decay
    p.vy *= decay
    p.speed *= decay

    const typicalL = this.mantas.length ? this.mantas.reduce((a, m) => a + m.L, 0) / this.mantas.length : 40
    let usual = 0
    if (this.speeds.length > 20) {
      const sorted = [...this.speeds].sort((a, b) => a - b)
      usual = sorted[Math.floor(sorted.length * 0.75)]! * 1.4
    }
    this.threat = Math.max(typicalL * 5, usual) * (1 + this.tolerance)
    if (p.active && p.fine && p.still > 1.5) this.tolerance = Math.min(0.6, this.tolerance + dt * 0.01)

    const cx = this.W / 2, cy = this.H / 2
    this.ripples = this.ripples.filter(rp => this.t - rp.t < RIPPLE_S)
    for (const g of this.grains) {
      const pt = g.patch
      const lx = (pt.light ? pt.x : cx) - g.x, ly = (pt.light ? pt.y : cy) - g.y
      const pullK = pt.light ? 0.5 : 0
      if (!pt.light && (g.dart -= dt) <= 0) {
        g.dart = 0.6 + this.rand() * 1.4
        const a = this.rand() * Math.PI * 2
        g.vx += Math.cos(a) * 7
        g.vy += Math.sin(a) * 7
      }
      const jitter = pt.light ? 30 : 12
      g.vx += ((hash2(Math.floor(g.x), Math.floor(this.t * 3), 1) - 0.5) * jitter + lx * pullK - g.vx * 1.2) * dt
      g.vy += ((hash2(Math.floor(g.y), Math.floor(this.t * 3), 2) - 0.5) * jitter + ly * pullK - g.vy * 1.2) * dt
      const v = Math.hypot(g.vx, g.vy)
      if (v > 0.8) { g.hx = g.vx / v; g.hy = g.vy / v }
      g.x += (g.vx + this.drift.x) * dt
      g.y += (g.vy + this.drift.y) * dt
      g.life -= dt
      const gx = Math.floor(g.x), gy = Math.floor(g.y)
      if (gx >= 0 && gy >= 0 && gx < this.W && gy < this.H && this.calm[gy * this.W + gx]! > 0.5) g.life = Math.min(g.life, 1.2)
      g.glow = Math.max(0, g.glow - dt * 1.4)
      if (pt.light) {
        const age = this.t - pt.born
        const on = smooth(0, 1.2, age) * (1 - smooth(32, 40, age))
        const reach = Math.min(this.W, this.H) * 0.13
        const d = Math.hypot(g.x - pt.x, g.y - pt.y) / reach
        if (d < 1) g.glow = Math.max(g.glow, on * 0.55 * (1 - d))
      }
    }

    for (const pt of this.patches) pt.density = 0
    for (const g of this.grains) {
      const d = Math.hypot(g.x - g.patch.x, g.y - g.patch.y)
      if (d < Math.min(this.W, this.H) * 0.13) g.patch.density += 1 / 95
    }

    const senses: Senses = {
      t: this.t, W: this.W, H: this.H, pointer: this.pointer,
      threat: this.threat, drift: this.drift, patches: this.patches, mantas: this.mantas, avoid: this.avoid, ceiling: this.ceiling, night: this.night,
    }
    if (this.night && this.t >= this.nextNap && !this.mantas.some(m => m.sleepUntil >= 0)) {
      // only a manta wholly on screen falls asleep: wingtips reach 1.1 body lengths out, and the sheet's lip covers the bottom 64 px
      const floor = this.H - 64 / this.cellCss
      const resting = this.mantas.filter(m => m.mode === 'cruise' && m.madAt < 0
        && m.x > m.L * 1.2 && m.x < this.W - m.L * 1.2 && m.y > m.L && m.y < floor - m.L)
      const m = resting[Math.floor(this.rand() * resting.length)]
      if (m) m.nap(this.t, this.t + 20 + this.rand() * 25)
      this.nextNap = this.t + (m ? 40 + this.rand() * 50 : 4)
    }
    for (const m of this.mantas) m.think(senses, dt, this.rand)

    for (const m of this.mantas) {
      if (!m.splash) continue
      m.splash = false
      // the wings are widest 0.11 body lengths behind the center (U_TIP in body.ts)
      const c = Math.cos(m.heading), s = Math.sin(m.heading), a = -0.11 * m.L, w = m.S * m.L
      this.ripples.push(
        { x: m.x, y: m.y, t: this.t, scale: 1.25 },
        { x: m.x + c * a - s * w, y: m.y + s * a + c * w, t: this.t + 0.05, scale: 0.7 },
        { x: m.x + c * a + s * w, y: m.y + s * a - c * w, t: this.t + 0.05, scale: 0.7 },
      )
      this.onSplash?.()
    }

    for (const m of this.mantas) {
      const mouth = m.mouth()
      const open = m.lobes > 0.5
      const r = m.L * (open ? 0.2 : 0.08), draw = r * 2.4
      const wake = m.L * 0.9
      for (const g of this.grains) {
        const dx = g.x - mouth.x, dy = g.y - mouth.y
        const d2 = dx * dx + dy * dy
        if (open && d2 < draw * draw && d2 > 1e-6) {
          const d = Math.sqrt(d2), k = (1 - d / draw) * 90 * dt
          g.vx -= dx / d * k
          g.vy -= dy / d * k
        }
        if (d2 < r * r && m.lobes > 0.4 && this.rand() < dt * 4) { g.life = 0; m.full = Math.min(1, m.full + 0.003) }
        else if (this.night && d2 < wake * wake && m.speed > m.L * 0.2) g.glow = Math.max(g.glow, 0.8)
      }
    }
    this.grains = this.grains.filter(g => g.life > 0)
    this.patches = this.patches.filter(pt => this.grains.some(g => g.patch === pt) || this.t - pt.born < 2)
  }

  private solveCaustics() {
    const { t, gw, W, H } = this
    const gh = this.fx.length / gw
    for (let cy = 0; cy < gh; cy++) {
      for (let cx = 0; cx < gw; cx++) {
        const gx = cx - 2, gy = cy - 2
        const h = hash2(gx, gy, 7), h2 = hash2(gx, gy, 8)
        this.fx[cy * gw + cx] = (gx + 0.5 + 0.38 * Math.sin(t * 0.35 + h * 6.28)) * VORONOI
        this.fy[cy * gw + cx] = (gy + 0.5 + 0.38 * Math.cos(t * 0.3 + h2 * 6.28)) * VORONOI
      }
    }
    for (let y = 0; y <= H + 1; y++) this.warpX[y] = Math.sin(y * 0.07 + t * 0.5) * 5 + Math.sin(y * 0.19 + t * 0.21) * 2
    for (let x = 0; x <= W + 1; x++) this.warpY[x] = Math.sin(x * 0.06 - t * 0.4) * 5 + Math.sin(x * 0.17 - t * 0.17) * 2
    for (let k = 0; k <= W + H + 1; k++) {
      this.warpSum[k] = Math.sin(k * 0.045 - t * 0.3) * 3.2
      this.warpDiff[k] = Math.sin((k - H - 1) * 0.05 + t * 0.25) * 3.2
    }
    const { hw, hh } = this
    for (let j = 0; j < hh; j++) {
      const y = Math.min(H, j * 2)
      const ax = this.warpX[y]!
      for (let i = 0; i < hw; i++) {
        const x = Math.min(W, i * 2)
        this.eHalf[j * hw + i] = this.edgeAt(x, y, ax)
      }
    }
  }

  private edgeAt(x: number, y: number, ax = this.warpX[y]!) {
    const { gw, H } = this
    const gh = this.fx.length / gw
    const wx = x + ax + this.warpSum[x + y]!, wy = y + this.warpY[x]! + this.warpDiff[x - y + H + 1]!
    const gx = Math.floor(wx / VORONOI) + 2, gy = Math.floor(wy / VORONOI) + 2
    let f1 = 1e9, f2 = 1e9
    for (let b = gy - 1; b <= gy + 1; b++) {
      if (b < 0 || b >= gh) continue
      for (let a = gx - 1; a <= gx + 1; a++) {
        if (a < 0 || a >= gw) continue
        const dx = wx - this.fx[b * gw + a]!, dy = wy - this.fy[b * gw + a]!
        const d = dx * dx + dy * dy
        if (d < f1) { f2 = f1; f1 = d }
        else if (d < f2) f2 = d
      }
    }
    return Math.sqrt(f2) - Math.sqrt(f1)
  }

  private draw() {
    if (!this.frame) return
    const { W, H, fb, pal, calm } = this
    const night = this.night
    const t0 = performance.now()
    const ks = pal.causticStrength
    this.solveCaustics()
    const { hw, eHalf } = this
    for (let y = 0; y < H; y++) {
      const j = y >> 1, fy = (y & 1) * 0.5
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        let c = this.ground[i]!
        const q = calm[i]!
        if (q < 0.97) {
          const strength = (1 - q) * ks * this.mod[i]!
          const k = j * hw + (x >> 1), fx = (x & 1) * 0.5
          const top = eHalf[k]! + (eHalf[k + 1]! - eHalf[k]!) * fx
          const bottom = eHalf[k + hw]! + (eHalf[k + hw + 1]! - eHalf[k + hw]!) * fx
          const dotted = ((x + y) & 1) === 0
          let e = top + (bottom - top) * fy
          if (dotted && e < 2.8) e = this.edgeAt(x, y)
          const core = 1.25 * Math.min(1, strength * 3)
          const th = bayer(x, y)
          if (e < core && dotted && th < Math.max(strength * 1.5, pal.causticCore) * (1 - smooth(0.8, 0.9, q))) c = pal.light
          else if (e < core * 1.9 && th < 0.16 * strength) c = pal.lightSoft
        }
        fb[i] = c
      }
    }

    for (const rp of this.ripples) this.drawRipple(rp)
    if (night) for (const pt of this.patches) this.drawDiveLight(pt)

    const order = [...this.mantas].sort((a, b) => a.depth - b.depth)
    // dt 0 draws every body settled
    const dt = this.running ? this.t - this.drawnT : 0
    this.drawnT = this.t
    let spare = true
    for (let k = 0; k < order.length; k++) {
      if (order[(k + this.offer) % order.length]!.raster(W, H, this.deepGround, this.light, this.calmText, this.calmChrome, night, this.t, dt, spare)) spare = false
    }
    this.offer++
    for (const m of order) {
      this.mosaic.reduce(m, pal, night)
      this.castShadow(m)
    }
    for (const g of this.grains) this.drawGrain(g)
    for (const m of order) {
      for (let k = 0; k < m.count; k++) if (m.colors[k]) fb[m.cells[k]!] = m.colors[k]!
      const asleep = night ? m.zzz(this.t) : -1
      if (asleep >= 1) this.drawZzz(m, asleep)
      // the mark pops in once the angry manta is clear of the page's text and the calm water around it, and stays
      if (m.madAt >= 0 && this.t >= m.madAt && m.veinAt < 0) {
        let under = false
        for (let k = 0; k < m.count && !under; k++) under = this.calm[m.cells[k]!]! > 0.05
        if (!under) m.veinAt = this.t
      }
    }
    this.mosaic.compose(order, this.t, !this.running)
    this.ctx.putImageData(this.frame, 0, 0)
    const ms = performance.now() - t0
    this.frameMs += (ms - this.frameMs) * 0.1
    if (!spare) this.freshMs += (ms - this.freshMs) * 0.1
  }

  private castShadow(m: Manta) {
    const { W, H, fb, pal, ground } = this
    const sh = this.mosaic.shadowOf(m), cols = this.mosaic.cols
    const o = m.shadowOffset(this.night), ox = Math.round(m.x) + o.x, oy = Math.round(m.y) + o.y
    const s = Math.floor(m.sink), f = m.sink - s
    for (let k = 0; k < sh.shade; k++) {
      const at = sh.shadeAt[k]!, kind = sh.shadeKind[k]!, i = at % cols, j = (at - i) / cols
      const pale = kind & DEEP ? 0 : 1, mix = pal.shadowMix[pale] ?? 0
      for (let q = 0; q < 9; q++) {
        if (!(kind & (1 << q))) continue
        const x = 3 * i + (q % 3), y = 3 * j + ((q / 3) | 0)
        if (x >= W || y >= H) continue
        const idx = y * W + x, th = bayer(x - ox, y - oy), step = s + (f > th ? 1 : 0)
        if (step >= SINKS || Math.max(labelClear(this.calmChrome[idx]!), smooth(0.35, 0.82, this.calmText[idx]!)) > th) continue
        const tone = pal.shadow[step]!
        fb[idx] = mix ? mixPacked(ground[idx]!, tone[0]!, mix) : tone[pale]!
      }
    }
  }

  // a second into a nap, z Z Z pop in 0.6 s apart up and to the right of the head, a cell a dot, bob, and clear together
  // every 2.4 s
  private drawZzz(m: Manta, asleep: number) {
    const { W, H, fb } = this
    const head = m.mouth(), cycle = (asleep - 1) % 2.4
    const ox = Math.round(m.x), oy = Math.round(m.y)
    for (let j = 0; j < DOZE.length; j++) {
      if (cycle < j * 0.6) continue
      const g = DOZE[j]! * FACE_X * FACE_Y
      const x0 = Math.round(head.x + 4 + j * 6), y0 = Math.round(head.y - 10 - j * 7 + Math.sin((asleep + j * 0.7) * 3))
      for (let k = 0; k < FACE_X * FACE_Y; k++) {
        if (!MASKS[g + k]) continue
        const x = x0 + (k % FACE_X), y = y0 + ((k / FACE_X) | 0)
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        const i = y * W + x
        if (this.calmText[i]! > 0.5 || Math.max(m.sink / SINKS, labelClear(this.calmChrome[i]!)) > bayer(x - ox, y - oy)) continue
        fb[i] = this.pal.doze
      }
    }
  }

  private drawRipple(rp: Ripple) {
    const age = this.t - rp.t
    if (age < 0 || age >= RIPPLE_S) return
    const k = age / RIPPLE_S
    const R = Math.min(this.W, this.H) * 0.14 * rp.scale * (1 - Math.pow(1 - k, 3))
    const v = Math.pow(1 - k, 1.4) * (rp.scale < 1 ? 0.6 : 1)
    const { W, H, fb, pal, calm } = this
    const band = 1.3
    const tone = this.night ? pal.glow[1]! : pal.light
    const x0 = Math.max(0, Math.floor(rp.x - R - band)), x1 = Math.min(W - 1, Math.ceil(rp.x + R + band))
    const y0 = Math.max(0, Math.floor(rp.y - R - band)), y1 = Math.min(H - 1, Math.ceil(rp.y + R + band))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const e = Math.abs(Math.hypot(x - rp.x, y - rp.y) - R)
        if (e > band || calm[y * W + x]! > 0.5) continue
        if (bayer(x, y) < v * (1 - e / band)) fb[y * W + x] = tone
      }
    }
  }

  private drawGrain(g: Grain) {
    const x = Math.floor(g.x), y = Math.floor(g.y)
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return
    if (this.calm[y * this.W + x]! > 0.5) return
    const fade = clamp(g.life / 4, 0, 1)
    if (bayer(x, y) > fade) return
    const { fb, W, pal } = this
    if (this.night && g.glow > 0.05) {
      fb[y * W + x] = pal.glow[0]!
      const r = g.glow > 0.5 ? 1 : 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (!dx && !dy) continue
          const xx = x + dx, yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < W && yy < this.H && bayer(xx, yy) < g.glow * 0.6) fb[yy * W + xx] = pal.glow[2]!
        }
      }
      return
    }
    if (this.night) {
      fb[y * W + x] = pal.plankton[(x + y + Math.floor(this.t * 4)) % 5 === 0 ? 1 : 0]!
      return
    }
    fb[y * W + x] = pal.plankton[0]!
    const tx = Math.round(x - g.hx), ty = Math.round(y - g.hy)
    if ((tx !== x || ty !== y) && tx >= 0 && ty >= 0 && tx < W && ty < this.H) fb[ty * W + tx] = pal.plankton[1]!
  }

  private drawDiveLight(pt: Patch) {
    const age = this.t - pt.born
    const k = smooth(0, 1.2, age) * (1 - smooth(32, 40, age))
    if (k <= 0) return
    const R = Math.min(this.W, this.H) * 0.13
    const { W, H, fb, pal } = this
    const x0 = Math.max(0, Math.floor(pt.x - R)), x1 = Math.min(W - 1, Math.ceil(pt.x + R))
    const y0 = Math.max(0, Math.floor(pt.y - R)), y1 = Math.min(H - 1, Math.ceil(pt.y + R))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - pt.x, (y - pt.y) * 1.15) / R
        if (d >= 1) continue
        const v = k * Math.pow(1 - d, 1.6)
        const th = bayer(x, y)
        if (v > th) fb[y * W + x] = v > 0.75 ? pal.glow[1]! : v > 0.4 ? pal.glow[3]! : pal.lightSoft
      }
    }
  }

  private tick = (now: number) => {
    if (!this.running) return
    if ((window.devicePixelRatio || 1) !== this.dpr) this.onRatio()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    this.acc += dt
    let steps = 0
    while (this.acc >= STEP && steps < 4) {
      this.step(STEP)
      this.acc -= STEP
      steps++
    }
    if (steps === 4) this.acc = 0
    const cost = Math.max(this.frameMs, this.freshMs)
    this.slowFor = cost > 14 ? this.slowFor + dt : 0
    this.fastFor = cost < 10 ? this.fastFor + dt : 0
    if (this.slowFor > 1) this.half = true
    else if (this.fastFor > 10) this.half = false
    if (steps) {
      this.skip = this.half && !this.skip
      if (!this.skip) this.draw()
    }
    this.raf = requestAnimationFrame(this.tick)
  }
}
