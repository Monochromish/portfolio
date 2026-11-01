import { bayer } from '../utils/dither'
import { Drawing, inside, type Mark } from './body'
import { clamp, labelClear, smooth, wrapAngle } from './math'
import { SINKS, type Palette } from './palette'

export interface Patch {
  x: number
  y: number
  born: number
  light: boolean
  density: number
  dir: number
}

export type Mode = 'cruise' | 'curious' | 'flee' | 'feed' | 'mad' | 'sleep'

const MOUTH_REACH = 0.47

export interface Senses {
  t: number
  W: number
  H: number
  pointer: { x: number, y: number, vx: number, vy: number, still: number, speed: number, fine: boolean, active: boolean, overText: boolean }
  threat: number
  drift: { x: number, y: number }
  patches: Patch[]
  mantas: Manta[]
  avoid: { x0: number, y0: number, x1: number, y1: number, soft: boolean }[]
  ceiling: number
  night: boolean
}

// cells between the nearest edge of a body and the paragraph
const PHONE_TEXT_CLEAR = 12

export class Manta {
  x: number
  y: number
  heading: number
  speed: number
  turn = 0
  bank = 0
  flap: number
  effort = 0.25
  lobes = 0
  depth: number
  mode: Mode = 'cruise'
  patch: Patch | null = null
  trust = 0
  curiousFor = 0
  pass: 'approach' | 'through' | 'out' = 'approach'
  passSide = 1
  private passOut = 0
  fear = 0
  fleeAngle = 0
  alarmAt = -1
  orbitDir: number
  wander = 0
  full = 0
  cells = new Int32Array(0)
  colors = new Uint32Array(0)
  shades = new Uint32Array(0)
  count = 0
  edge = new Int32Array(0)
  edgeCount = 0
  private dive = 0
  sink = 0
  madAt = -1
  madPhase: 'charge' | 'slap' | 'huff' | 'sulk' | null = null
  splash = false
  veinAt = -1
  sleepUntil = -1
  private sleptAt = 0
  private phaseAt = 0
  private grudge = { x: 0, y: 0 }
  private scorn = { x: 0, y: 0 }
  private drawing = new Drawing()
  private readonly outline: number[] = []
  readonly mark: Mark

  targetL: number

  constructor(
    readonly id: number,
    public L: number,
    readonly S: number,
    x: number,
    y: number,
    heading: number,
    readonly curiosity: number,
    readonly boldness: number,
    rand: () => number,
  ) {
    this.targetL = L
    this.x = x
    this.y = y
    this.heading = heading
    this.speed = L * 0.3
    this.flap = rand() * Math.PI * 2
    this.depth = 0.55 + rand() * 0.45
    this.orbitDir = rand() < 0.5 ? -1 : 1
    this.passSide = rand() < 0.5 ? -1 : 1
    this.mark = { s: id * 17 + 3, a: rand() * 0.3 - 0.15, tilt: rand() * 0.5 - 0.2, gray: rand() }
    for (let u = -0.12; u <= 0.98; u += 0.06) {
      let edge = 0
      for (let w = 0.04; w <= S + 0.05; w += 0.04) if (inside(u, w, S)) edge = w
      if (inside(u, 0, S)) this.outline.push(0.45 - u, 0)
      if (edge) this.outline.push(0.45 - u, edge, 0.45 - u, -edge)
    }
  }

  rim(): [number, number][] {
    const points: [number, number][] = []
    for (let k = 0; k < this.outline.length; k += 2) points.push([this.outline[k]! * this.L, this.outline[k + 1]! * this.L])
    return points
  }

  mouth() {
    const f = MOUTH_REACH * this.L
    return { x: this.x + Math.cos(this.heading) * f, y: this.y + Math.sin(this.heading) * f }
  }

  shadowOffset(night: boolean) {
    const k = this.L * (0.1 + 0.16 * this.depth) * (night ? 0.4 : 1)
    return { x: Math.round(k * 0.55), y: Math.round(k) }
  }

  raster(W: number, H: number, pal: Palette, sunk: Uint32Array, light: number[], calm: Float32Array, chrome: Float32Array, night: boolean, t: number, dt: number, spare: boolean) {
    const fresh = this.drawing.update(this, light, night, t, spare)
    const { xy, tone, body, held } = this.drawing.sprite!
    const skin = pal.skin[this.drawing.level]!
    const o = this.shadowOffset(night)
    const ox = Math.round(this.x), oy = Math.round(this.y)
    if (this.cells.length < tone.length) {
      this.cells = new Int32Array(tone.length)
      this.colors = new Uint32Array(tone.length)
      this.shades = new Uint32Array(tone.length)
      this.edge = new Int32Array(tone.length)
    }
    const c = Math.cos(this.heading), s = Math.sin(this.heading), L = this.L
    let deep = 0
    for (let k = 0; k < this.outline.length; k += 2) {
      const a = this.outline[k]! * L, w = this.outline[k + 1]! * L
      const x = Math.floor(this.x + c * a - s * w), y = Math.floor(this.y + s * a + c * w)
      if (x >= 0 && y >= 0 && x < W && y < H && calm[y * W + x]! > deep) deep = calm[y * W + x]!
    }
    // the head, from 0.3 body lengths ahead of the centre, clears a label as one piece, eased in over the 0.1 behind it
    const hc = Math.cos(held.heading), hs = Math.sin(held.heading), front = 0.3 * L
    let head = 0
    for (let k = 0; k < body; k++) {
      const dx = xy[2 * k]!, dy = xy[2 * k + 1]!, x = ox + dx, y = oy + dy
      if (dx * hc + dy * hs > front && x >= 0 && y >= 0 && x < W && y < H) head = Math.max(head, chrome[y * W + x]!)
    }
    const lift = labelClear(head)
    const target = smooth(0.35, 0.82, deep) * 0.9
    this.dive = dt > 0 ? this.dive + (target - this.dive) * (1 - Math.exp(-dt / (target > this.dive ? 0.09 : 0.22))) : target
    const lag = target - this.dive > 0.02
    // the dive reaches 0.9 and has sunk the body away from 0.87; a step holds until the dive is 0.65 of a step past it
    const want = Math.min(SINKS, this.dive / 0.87 * SINKS)
    if (want > SINKS - 1) this.sink = want
    else if (dt <= 0 || Math.abs(want - this.sink) > 0.65) this.sink = Math.round(want)
    let n = 0
    let e = 0
    for (let k = 0; k < tone.length; k++) {
      const x = ox + xy[2 * k]!, y = oy + xy[2 * k + 1]!
      if (x >= W || y >= H) continue
      // body just past the top or left edge still casts a shadow onto the screen
      if (x < 0 || y < 0) {
        if (x >= -o.x && y >= -o.y && x + o.x < W) this.edge[e++] = (y + o.y) * W + x + o.x
        continue
      }
      const idx = y * W + x
      let q = labelClear(chrome[idx]!)
      if (k >= body) q = Math.max(q, smooth(0.35, 0.82, calm[idx]!))
      else {
        if (lift) q = Math.max(q, lift * smooth(front - 0.1 * L, front, xy[2 * k]! * hc + xy[2 * k + 1]! * hs))
        if (lag) q = Math.max(q, smooth(0.84, 0.89, calm[idx]!))
      }
      const p = Math.max(this.sink, q * SINKS), i = Math.floor(p)
      const step = i + (p - i > bayer(x - ox, y - oy) ? 1 : 0)
      if (step >= SINKS) {
        this.colors[n] = sunk[idx]!
        this.shades[n] = sunk[idx]!
      }
      else {
        const sl = tone[k]!
        this.colors[n] = skin[step]![sl]!
        this.shades[n] = skin[step]![pal.shade[sl]!]!
      }
      this.cells[n] = idx
      n++
    }
    this.count = n
    this.edgeCount = e
    return fresh
  }

  eta(px: number, py: number) {
    const d = Math.hypot(px - this.x, py - this.y)
    const off = Math.abs(wrapAngle(Math.atan2(py - this.y, px - this.x) - this.heading))
    const maxTurn = 0.08 + Math.max(this.speed, this.L * 0.3) / this.L
    return d / Math.max(this.speed, this.L * 0.45) + off / maxTurn
  }

  provoke(at: number, x: number, y: number, fromX: number, fromY: number) {
    this.madAt = at
    this.madPhase = null
    this.veinAt = -1
    this.grudge = { x, y }
    this.scorn = { x: fromX, y: fromY }
  }

  nap(t: number, until: number) {
    this.sleptAt = t
    this.sleepUntil = until
  }

  // anger mark frame, 0 none, 1 small, 2 full, 3 swollen: pops in, swells every 0.6 s and on the slap, pops out as the sulk begins
  vein(t: number) {
    if (this.madAt < 0 || this.veinAt < 0) return 0
    const since = t - this.phaseAt
    if (this.madPhase === 'sulk') return since < 0.1 ? 1 : 0
    if (this.madPhase === 'slap') return since < 0.25 ? 3 : 2
    const age = t - this.veinAt
    if (age < 0.05) return 1
    if (age < 0.12) return 3
    return age % 0.6 < 0.1 ? 3 : 2
  }

  zzz(t: number) {
    return this.mode === 'sleep' ? t - this.sleptAt : -1
  }

  // within a body length of the header or the page's text, too close to start a charge
  private hemmed(ss: Senses) {
    const clear = this.L
    if (this.y - ss.ceiling < clear) return true
    return ss.avoid.some(a => !a.soft && Math.hypot(this.x - clamp(this.x, a.x0, a.x1), this.y - clamp(this.y, a.y0, a.y1)) < clear)
  }

  private fume(t: number) {
    const since = t - this.phaseAt
    const phase = (next: typeof this.madPhase) => {
      this.madPhase = next
      this.phaseAt = t
    }
    if (!this.madPhase) phase('charge')
    else if (this.madPhase === 'charge') {
      const m = this.mouth()
      if (Math.hypot(this.grudge.x - m.x, this.grudge.y - m.y) < this.L * 0.6 || since > 6) {
        phase('slap')
        this.splash = true
      }
    }
    else if (this.madPhase === 'slap' && since > 0.4) phase('huff')
    else if (this.madPhase === 'huff' && since > 1.1) phase('sulk')
    else if (this.madPhase === 'sulk' && since > 14) {
      this.madPhase = null
      this.madAt = -1
    }
  }

  sees(x: number, y: number, range: number) {
    const dx = x - this.x, dy = y - this.y, d = Math.hypot(dx, dy)
    if (d > range) return false
    return d < this.L * 1.1 || Math.abs(wrapAngle(Math.atan2(dy, dx) - this.heading)) < 1.92
  }

  private choosePatch(ss: Senses) {
    if (this.full >= 1) return null
    let best: Patch | null = null, bestScore = Infinity, currentScore = Infinity
    for (const pt of ss.patches) {
      if (pt.density < 0.05) continue
      const known = pt === this.patch && Math.hypot(pt.x - this.x, pt.y - this.y) < this.L * 5
      if (!known && !this.sees(pt.x, pt.y, this.L * 3.4)) continue
      const mine = this.eta(pt.x, pt.y)
      let rival = Infinity
      for (const o of ss.mantas) if (o !== this && o.patch === pt) rival = Math.min(rival, o.eta(pt.x, pt.y))
      const lead = Math.min(2, Math.max(-2, rival - mine))
      const score = mine - lead * (pt.density > 0.7 ? 0.2 : 0.8) - pt.density * 1.2
      if (pt === this.patch) currentScore = score
      if (score < bestScore) { bestScore = score; best = pt }
    }
    if (this.patch && best !== this.patch && currentScore < Infinity && bestScore > currentScore - Math.abs(currentScore) * 0.3) return this.patch
    return best
  }

  think(ss: Senses, dt: number, rand: () => number) {
    const L = this.L
    const p = ss.pointer
    this.fear = Math.max(0, this.fear - dt * 0.6)
    if (this.alarmAt >= 0 && ss.t >= this.alarmAt) {
      this.alarmAt = -1
      this.fear = Math.max(this.fear, 0.6)
    }
    if (this.madAt >= 0 && ss.t >= this.madAt) {
      // it gathers in open water before it charges, and lets the grudge go if it cannot within 8 s
      if (this.madPhase || !this.hemmed(ss)) this.fume(ss.t)
      else if (ss.t - this.madAt > 8) this.madAt = -1
      if (this.madAt >= 0) {
        this.trust = 0
        if (this.madPhase !== 'sulk') {
          this.fear = 0
          this.alarmAt = -1
        }
      }
    }

    if (p.fine && p.active) {
      const dx = this.x - p.x, dy = this.y - p.y, dist = Math.hypot(dx, dy) || 1
      // trust climbs 20% of the way to 1 per quarter second and halves every 4 s
      if (dist < L * 2.2 && p.speed < L * 0.6) this.trust += (1 - this.trust) * (1 - Math.pow(0.8, dt / 0.25))
      else this.trust *= Math.pow(0.5, dt / 4)
      if (this.fear < 0.5) {
        // projected resting point of the gesture, as for a fling
        const ex = p.x + p.vx * 0.45, ey = p.y + p.vy * 0.45
        const sx = ex - p.x, sy = ey - p.y, sl = sx * sx + sy * sy
        const k = sl > 0 ? clamp((dx * sx + dy * sy) / sl, 0, 1) : 0
        const reach = Math.hypot(this.x - (p.x + sx * k), this.y - (p.y + sy * k))
        const closing = (dx * p.vx + dy * p.vy) / dist
        const threshold = ss.threat * (1 + 2 * this.trust) * (0.8 + 0.4 * this.boldness)
        if (reach < L * 1.1 && closing > threshold) {
          this.fear = 1
          this.trust *= 0.3
          this.fleeAngle = Math.atan2(this.y - ey, this.x - ex)
          for (const o of ss.mantas) {
            if (o === this || o.alarmAt >= 0 || o.fear > 0.5 || !o.sees(this.x, this.y, L * 4.5)) continue
            const od = Math.hypot(o.x - this.x, o.y - this.y)
            o.alarmAt = ss.t + 0.12 + od / (L * 5)
            o.fleeAngle = Math.atan2(o.y - this.y, o.x - this.x)
          }
        }
      }
    }
    else this.trust *= Math.pow(0.5, dt / 4)

    this.patch = this.madAt >= 0 && ss.t >= this.madAt ? null : this.choosePatch(ss)

    if (this.sleepUntil >= 0) {
      const stirred = p.active && p.speed > L * 0.6 && Math.hypot(p.x - this.x, p.y - this.y) < L * 1.6
      if (!ss.night || ss.t >= this.sleepUntil || this.fear > 0.2 || this.madAt >= 0 || this.patch || stirred) this.sleepUntil = -1
    }

    const curiousNow = p.fine && p.active && !p.overText && p.still > 0.6 && this.curiosity > 0.45 && !this.madPhase && this.sleepUntil < 0
      && Math.hypot(p.x - this.x, p.y - this.y) < L * (this.mode === 'curious' ? 4.2 : 3.4)
    this.curiousFor = curiousNow ? this.curiousFor + dt : Math.max(0, this.curiousFor - dt * 2)

    let mode: Mode = 'cruise'
    if (this.madAt >= 0 && ss.t >= this.madAt && this.madPhase !== 'sulk') mode = 'mad'
    else if (this.fear > 0.3) mode = 'flee'
    else if (this.patch) mode = 'feed'
    else if (this.sleepUntil >= 0) mode = 'sleep'
    else if (this.curiousFor > 0.15) mode = 'curious'
    this.mode = mode
    this.swim(ss, mode, dt, rand)

    const feeding = mode === 'feed'
    this.lobes += ((feeding ? 1 : 0) - this.lobes) * (1 - Math.exp(-dt * 2.2))
    const rising = feeding || mode === 'mad' ? 0.95 : mode === 'sleep' ? 0.3 : 0.6 + 0.35 * Math.sin(ss.t * 0.05 + this.id)
    this.depth += (rising - this.depth) * (1 - Math.exp(-dt * 0.6))
    this.full = Math.max(0, this.full - dt / 90)
    this.L += (this.targetL - this.L) * (1 - Math.exp(-dt * 2.2))
  }

  private swim(ss: Senses, mode: Mode, dt: number, rand: () => number) {
    const L = this.L
    const p = ss.pointer
    let want = this.heading
    let speedGoal = L * 0.34
    let effortGoal = 0.25
    const pull = (tx: number, ty: number) => Math.atan2(ty - this.y, tx - this.x)
    const pt = this.patch

    if (mode === 'cruise') {
      this.wander += (rand() - 0.5) * 1.6 * dt - this.wander * 0.25 * dt
      want = this.heading + this.wander * (ss.night ? 0.55 : 0.9)
      if (ss.night) {
        speedGoal = L * 0.22
        effortGoal = 0.15
      }
    }
    else if (mode === 'sleep') {
      this.wander += (rand() - 0.5) * 0.4 * dt - this.wander * 0.25 * dt
      want = this.heading + this.wander * 0.4
      speedGoal = L * 0.05
      effortGoal = 0.05
    }
    else if (mode === 'flee') {
      want = this.fleeAngle
      speedGoal = L * 1.35
      effortGoal = 1
    }
    else if (mode === 'mad') {
      const g = this.grudge
      effortGoal = 1
      if (!this.madPhase) speedGoal = L * 0.3
      else if (this.madPhase === 'charge') {
        const m = this.mouth()
        want = pull(g.x, g.y)
        speedGoal = L * clamp(0.5 + Math.hypot(g.x - m.x, g.y - m.y) / L, 0.5, 1.8)
      }
      else if (this.madPhase === 'slap') speedGoal = L * 0.1
      else {
        want = Math.atan2(this.y - this.scorn.y, this.x - this.scorn.x)
        speedGoal = L * 1.3
      }
    }
    else if (mode === 'curious') {
      const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy)
      const radial = Math.atan2(dy, dx)
      const r = L * 0.95
      if (Math.abs(this.turn) > 0.05) this.orbitDir = Math.sign(this.turn)
      want = radial - this.orbitDir * (Math.PI / 2 - clamp((d - r) / (L * 1.5), -0.6, 1) * 0.9)
      speedGoal = L * 0.26
    }
    else if (pt && mode === 'feed') {
      const m = this.mouth()
      const t = this.eta(pt.x, pt.y)
      const fx = pt.x + ss.drift.x * t, fy = pt.y + ss.drift.y * t
      const inCloud = Math.hypot(pt.x - m.x, pt.y - m.y) < L * 0.4
      speedGoal = L * (inCloud ? 0.42 : 0.6)
      effortGoal = inCloud ? 0.3 : 0.55
      if (inCloud) this.pass = 'through'
      else if (this.pass === 'through') {
        this.pass = 'out'
        this.passOut = 0
        this.passSide = -this.passSide
      }
      if (this.pass === 'out') {
        this.passOut += dt
        if (Math.hypot(fx - this.x, fy - this.y) > L * 1.1 || this.passOut > 4) this.pass = 'approach'
      }
      if (this.pass === 'approach') {
        const dx = fx - this.x, dy = fy - this.y, d = Math.hypot(dx, dy) || 1
        const mine = this.eta(fx, fy)
        const yield_ = d < L * 3.2 && ss.mantas.some((o) => {
          if (o === this || o.patch !== pt || o.mode !== 'feed') return false
          if (o.pass === 'through') return true
          if (o.pass === 'out' && Math.hypot(o.x - pt.x, o.y - pt.y) < L * 1.5) return true
          if (o.pass !== 'approach' || Math.hypot(o.x - pt.x, o.y - pt.y) > L * 3.2) return false
          const theirs = o.eta(fx, fy)
          return theirs < mine || (theirs === mine && o.id < this.id)
        })
        if (yield_) {
          want = pull(fx, fy) - pt.dir * (Math.PI / 2 - clamp((d - L * 2.4) / (L * 1.5), -0.6, 1) * 0.9)
          speedGoal = L * 0.45
        }
        else {
          const off = this.passSide * L * 0.22
          want = pull(fx - dy / d * off, fy + dx / d * off)
        }
      }
    }
    if (mode !== 'feed') this.pass = 'approach'

    let ax = Math.cos(want), ay = Math.sin(want)
    const edge = L * (ss.W < 160 ? 0.8 : 0.2), reach = L * 0.9
    const out = (v: number) => smooth(0, reach, v)
    ax += 2.4 * (out(edge - this.x) - out(this.x - (ss.W - edge)))
    ay += 2.4 * (out(edge - this.y) - out(this.y - (ss.H - edge)))
    for (const o of ss.mantas) {
      if (o === this) continue
      const dx = this.x - o.x, dy = this.y - o.y, d = Math.hypot(dx, dy)
      // wingtip to wingtip a manta spans about 2.2 body lengths
      const r = (this.L + o.L) * 1.15
      if (d < r && d > 0) { const k = (1 - d / r) * 2.2; ax += dx / d * k; ay += dy / d * k }
      const rvx = Math.cos(o.heading) * o.speed - Math.cos(this.heading) * this.speed
      const rvy = Math.sin(o.heading) * o.speed - Math.sin(this.heading) * this.speed
      const rv2 = rvx * rvx + rvy * rvy
      const tc = rv2 > 1e-6 ? -((o.x - this.x) * rvx + (o.y - this.y) * rvy) / rv2 : -1
      if (tc > 0 && tc < 2.5) {
        const px = this.x - (o.x + rvx * tc), py = this.y - (o.y + rvy * tc), pd = Math.hypot(px, py)
        if (pd < r) {
          const k = (1 - pd / r) * (1 - tc / 2.5) * 3
          if (pd > 0.001) { ax += px / pd * k; ay += py / pd * k }
          else { ax += -Math.sin(this.heading) * k * (this.id < o.id ? 1 : -1); ay += Math.cos(this.heading) * k * (this.id < o.id ? 1 : -1) }
          if (tc < 1.2) speedGoal *= 0.85
        }
      }
    }
    if (this.madPhase === 'sulk' && p.active) {
      const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy), r = L * 2.6
      if (d < r && d > 0) { const k = (1 - d / r) * 2; ax += dx / d * k; ay += dy / d * k }
    }
    const reading = p.overText && p.still > 1
    if (reading && mode === 'cruise') speedGoal *= 0.75
    const narrow = ss.W < 160
    // an angry manta keeps its whole body, wingtips up to 1.18 body lengths from the centre, off the header and the page's text, stiffly over the last 0.3 body lengths
    const clear = L * 1.25, stiff = L * 0.3
    if (mode === 'mad') {
      const below = this.y - ss.ceiling
      if (below < clear) ay += 4 * Math.min(1, (clear - below) / stiff)
      for (const a of ss.avoid) {
        if (a.soft) continue
        const cx = clamp(this.x, a.x0, a.x1), cy = clamp(this.y, a.y0, a.y1)
        let dx = this.x - cx, dy = this.y - cy, d = Math.hypot(dx, dy)
        if (d < 0.001) {
          dx = this.x - (a.x0 + a.x1) / 2
          dy = this.y - (a.y0 + a.y1) / 2
          d = Math.hypot(dx, dy) || 1
        }
        if (d < clear + stiff) {
          const k = 4 * Math.min(1, (clear + stiff - d) / stiff)
          ax += dx / d * k
          ay += dy / d * k
        }
      }
    }
    for (const a of mode === 'mad' ? [] : ss.avoid) {
      const cx = clamp(this.x, a.x0, a.x1), cy = clamp(this.y, a.y0, a.y1)
      const dx = this.x - cx, dy = this.y - cy, d = Math.hypot(dx, dy)
      let r = L * (reading ? 1.6 : narrow ? 0.9 : 1.25), gap = d
      if (narrow && d > 0.001) {
        if (a.soft) r = L * 0.45
        else {
          const ux = dx / d, uy = dy / d, hc = Math.cos(this.heading), hs = Math.sin(this.heading)
          gap = d - Math.abs(ux * hc + uy * hs) * 0.6 * L - Math.abs(uy * hc - ux * hs) * this.S * L
          r = PHONE_TEXT_CLEAR * (reading ? 1.5 : 1)
        }
      }
      if (gap < r) {
        const k = Math.min(1.6, 1 - gap / r) * (mode === 'feed' || mode === 'flee' ? 1.1 : 2.6)
        if (d > 0.001) { ax += dx / d * k; ay += dy / d * k }
        else { ax += Math.cos(this.heading) * k; ay += Math.sin(this.heading) * k }
      }
    }
    want = Math.atan2(ay, ax)
    // an angry manta brakes and pivots until it faces where it is going, within 0.6 rad, so it never drifts under the page while turning
    if (mode === 'mad' && (this.madPhase === 'charge' || this.madPhase === 'huff') && Math.abs(wrapAngle(want - this.heading)) > 0.6) speedGoal = L * 0.1

    const radius = L * (mode === 'flee' || mode === 'mad' ? 0.55 : mode === 'feed' ? 1 : 1.1)
    // an angry manta pivots, 1.2 rad/s even when slow
    const maxTurn = (mode === 'mad' ? 1.2 : 0.08) + this.speed / radius
    const err = wrapAngle(want - this.heading)
    const turnGoal = clamp(err * 1.6, -maxTurn, maxTurn)
    this.turn = clamp(this.turn + (turnGoal - this.turn) * (1 - Math.exp(-dt * 3)), -maxTurn, maxTurn)
    this.heading = wrapAngle(this.heading + this.turn * dt)
    this.bank += (clamp(this.turn * 0.9, -0.55, 0.55) - this.bank) * (1 - Math.exp(-dt * 2.5))

    this.effort += (effortGoal + (speedGoal > this.speed ? 0.25 : 0) - this.effort) * (1 - Math.exp(-dt * 2))
    const beat = this.madPhase === 'slap' ? 2.4 : mode === 'sleep' ? 0.45 : 1
    this.flap += dt * Math.PI * 2 * (0.32 + 0.45 * this.effort) * beat
    const thrust = speedGoal > this.speed ? 1.4 + 2 * this.effort : mode === 'mad' ? (this.madPhase === 'slap' ? 6 : 2.5) : 0.35
    this.speed += (speedGoal - this.speed) * (1 - Math.exp(-dt * thrust))
    this.x += Math.cos(this.heading) * this.speed * dt
    this.y += Math.sin(this.heading) * this.speed * dt
  }
}
