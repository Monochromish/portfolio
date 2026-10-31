import { bayer } from '../utils/dither'
import { clamp, labelClear, mixPacked, pack, smooth, tnoise, wrapAngle, type RGB } from './math'
import type { Palette } from './palette'

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

// u: head front (0) to tail base (1) in disc lengths; w: distance from the midline; wingtips at w = S around u = 0.56
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
  count = 0
  edge = new Int32Array(0)
  edgeCount = 0
  dive = 0
  madAt = -1
  madPhase: 'charge' | 'slap' | 'huff' | 'sulk' | null = null
  splash = false
  veinAt = -1
  sleepUntil = -1
  private sleptAt = 0
  private phaseAt = 0
  private grudge = { x: 0, y: 0 }
  private scorn = { x: 0, y: 0 }
  private mark: { s: number, a: number, tilt: number, gray: number }

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
  }

  private halfSpan(u: number) {
    const S = this.S
    if (u < 0.05 || u > 0.94) return -1
    if (u <= 0.56) return 0.17 + (S - 0.17) * Math.pow((u - 0.05) / 0.51, 0.78)
    return 0.16 + (S - 0.16) * Math.pow(1 - (u - 0.56) / 0.38, 1.9)
  }

  rim(): [number, number][] {
    const points: [number, number][] = []
    for (let u = 0.04; u <= 0.98; u += 0.06) {
      let edge = 0
      for (let w = 0.04; w <= this.S + 0.05; w += 0.04) if (this.inside(u, w)) edge = w
      const along = (0.45 - u) * this.L
      points.push([along, 0])
      if (edge) points.push([along, edge * this.L], [along, -edge * this.L])
    }
    return points
  }

  private inside(u: number, w: number) {
    if (u >= 0 && u <= 1 && w < 0.17 - 0.06 * smooth(0.75, 1, u)) return 1
    const hs = this.halfSpan(u)
    if (w < hs) return 1
    if (w < hs + 0.02) return 0.5
    const open = this.lobes
    const cu = u + 0.05 + 0.03 * open, cw = w - (0.135 + 0.02 * open)
    if (cu * cu / (0.0036 + 0.004 * open) + cw * cw / (0.0009 + 0.0012 * open) <= 1) return 1
    const pu = u - 0.97, pw = w - 0.13
    if (pu * pu / 0.0016 + pw * pw / 0.0016 <= 1) return 1
    if (u > 0.98 && u < 1.6 && w < 0.013 * (1 - (u - 0.98) / 0.62) + 0.004) return 1
    return 0
  }

  private wave = new Float32Array(128)

  private prepareWave() {
    const amp = 0.3 + 0.35 * this.effort
    for (let i = 0; i < 128; i++) this.wave[i] = amp * Math.sin(this.flap - 2.2 * (i / 64 - 0.2))
  }

  private angle(u: number, w: number, side: number) {
    const r = Math.min(1, w / this.S)
    const i = Math.max(0, Math.min(127, Math.round((u + 0.2) * 64)))
    return this.wave[i]! * r * Math.sqrt(Math.sqrt(r)) + side * this.bank * r
  }

  private marking(u: number, w: number) {
    const m = this.mark
    if (w < 0.19 || u < 0.08) return 0
    const n = (tnoise(u * 56 + m.s * 13, w * 56) - 0.5) * 0.16
    const edge = (0.52 + n + m.a * 0.4) - (u - 0.08) * (1.05 + m.tilt * 0.4)
    const front = u - (0.1 + 0.07 * Math.max(0, w - 0.3))
    const margin = this.halfSpan(u) - w
    if (front < 0 || w > edge + 0.02 || margin < 0.06) return 0
    const soft = clamp((edge - w) / 0.16, 0, 1) * clamp(front / 0.05, 0, 1) * clamp((margin - 0.06) / 0.08, 0, 1)
    if (tnoise(u * 208 + m.s * 7, w * 208 + 40) > 0.8 - m.gray * 0.15) return soft * 0.4
    return soft
  }

  mouth() {
    const f = MOUTH_REACH * this.L
    return { x: this.x + Math.cos(this.heading) * f, y: this.y + Math.sin(this.heading) * f }
  }

  shadowOffset(night: boolean) {
    const k = this.L * (0.1 + 0.16 * this.depth) * (night ? 0.4 : 1)
    return { x: Math.round(k * 0.55), y: Math.round(k) }
  }

  raster(W: number, H: number, pal: Palette, water: Uint32Array, light: number[], calm: Float32Array, chrome: Float32Array, night: boolean, dt: number) {
    this.prepareWave()
    const L = this.L, S = this.S
    const c = Math.cos(this.heading), s = Math.sin(this.heading)
    const cxp = this.x, cyp = this.y
    const ahead = 0.62 * L, behind = 0.56 * L
    const half = (S + 0.06) * L
    const quad = [[ahead, half], [ahead, -half], [-behind, -half], [-behind, half]].map(([a, l]) => [cxp + c * a! - s * l!, cyp + s * a! + c * l!] as const)
    let minY = Infinity, maxY = -Infinity
    for (const q of quad) { minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]) }
    const o = this.shadowOffset(night)
    const y0 = Math.max(-o.y, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY))
    const tailLen = Math.ceil(L * 0.7) + 4
    const need = Math.ceil((2 * half + 2) * (ahead + behind + 2) * 1.5) + tailLen * 3
    if (this.cells.length < need) {
      this.cells = new Int32Array(need)
      this.colors = new Uint32Array(need)
      this.edge = new Int32Array(need)
    }
    let n = 0
    let e = 0
    // body just past the top or left edge still casts a shadow onto the screen
    const offscreen = (px: number, py: number) => {
      if ((px < 0 || py < 0) && px >= -o.x && py >= -o.y && px < W && py < H && e < this.edge.length) this.edge[e++] = (py + o.y) * W + px + o.x
    }
    let deep = 0
    const fadeNight = night ? 0.55 + 0.45 * this.depth : 1
    for (let py = y0; py <= y1; py++) {
      const yc = py + 0.5
      let xl = Infinity, xr = -Infinity
      for (let e = 0; e < 4; e++) {
        const p0 = quad[e]!, p1 = quad[(e + 1) & 3]!
        if ((p0[1] <= yc && p1[1] >= yc) || (p1[1] <= yc && p0[1] >= yc)) {
          const xi = p1[1] === p0[1] ? p0[0] : p0[0] + (yc - p0[1]) * (p1[0] - p0[0]) / (p1[1] - p0[1])
          xl = Math.min(xl, xi); xr = Math.max(xr, xi)
        }
      }
      if (xl > xr) continue
      const xa = Math.max(-o.x, Math.floor(xl)), xb = Math.min(W - 1, Math.ceil(xr))
      for (let px = xa; px <= xb; px++) {
        const dx = px + 0.5 - cxp, dy = py + 0.5 - cyp
        const fw = (-dx * s + dy * c) / L
        if (fw > S + 0.05 || fw < -S - 0.05) continue
        const u = 0.45 - (dx * c + dy * s) / L
        if (u < -0.16 || u > 1.02) continue
        const side = fw < 0 ? -1 : 1
        let w = fw * side
        if (w > 0.15) {
          w = fw * side / Math.max(0.3, Math.cos(this.angle(u, w, side)))
          w = fw * side / Math.max(0.3, Math.cos(this.angle(u, w, side)))
        }
        const cover = this.inside(u, w)
        if (!cover) continue
        if (cover < 1 && bayer(px, py) > 0.5) continue
        if (px < 0 || py < 0) {
          offscreen(px, py)
          continue
        }
        const a = this.angle(u, w, side)
        const z = 1.2 * (w / S)
        const tilt = (0.7 * z / (1 + 0.28 * z * z) + a) * side
        const st = Math.sin(tilt)
        const dot = -s * st * light[0]! + c * st * light[1]! + Math.cos(tilt) * light[2]!
        const mottle = (tnoise(u * 88 + this.mark.s * 31, w * 88 * side + 128) - 0.5) * 0.22
        const lit = clamp(0.12 + 0.85 * dot - 0.22 * smooth(0.55, 1, w / S) + 0.12 * (1 - smooth(0, 0.22, w)) + mottle, 0, 1)
        const th = bayer(Math.floor(u * L * 0.9) & 7, (Math.floor(w * L * 0.9) * side) & 7)
        const inMark = this.marking(u, w) > th
        const tones = inMark ? pal.marks : pal.back
        const g = lit * 3, i = Math.floor(g)
        let col: RGB = night && inMark ? pal.marks[1]! : tones[Math.min(3, i + (g - i > th ? 1 : 0))]!
        const eye = this.mode !== 'sleep' && Math.abs(u - 0.085) < 0.02 && Math.abs(w - 0.165) < 0.018
        if (eye || (u < 0.03 && w < 0.15)) col = pal.back[0]!
        const idx = py * W + px
        if (calm[idx]! > deep) deep = calm[idx]!
        const sink = (1 - fadeNight) * 0.9
        let packed = sink > 0.02 && bayer(px, py) < sink ? water[idx]! : pack(col)
        if (labelClear(chrome[idx]!) > bayer(px, py)) packed = mixPacked(packed, water[idx]!, 0.85)
        this.cells[n] = idx
        this.colors[n] = packed
        n++
      }
    }
    const tail = pack(pal.back[1]!)
    const tailCell = (idx: number) => {
      const f = Math.max(labelClear(chrome[idx]!) * 0.85, smooth(0.35, 0.82, calm[idx]!) * 0.9)
      return f > 0.01 ? mixPacked(tail, water[idx]!, f) : tail
    }
    const at = (u: number) => [cxp + c * (0.45 - u) * L, cyp + s * (0.45 - u) * L] as const
    const [tx0, ty0] = at(0.98), [tx1, ty1] = at(1.6)
    const steps = Math.ceil(Math.hypot(tx1 - tx0, ty1 - ty0)) + 1
    for (let k = 0; k <= steps; k++) {
      const f = k / steps
      const px = Math.floor(tx0 + (tx1 - tx0) * f), py = Math.floor(ty0 + (ty1 - ty0) * f)
      if (px < 0 || py < 0 || px >= W || py >= H || n >= this.cells.length) {
        offscreen(px, py)
        continue
      }
      const idx = py * W + px
      this.cells[n] = idx
      this.colors[n] = tailCell(idx)
      n++
      if (f < 0.25 && L > 40 && n < this.cells.length && px + 1 < W) {
        this.cells[n] = idx + 1
        this.colors[n] = tailCell(idx + 1)
        n++
      }
    }
    const target = smooth(0.35, 0.82, deep) * 0.9
    this.dive = dt > 0 ? this.dive + (target - this.dive) * (1 - Math.exp(-dt / (target > this.dive ? 0.09 : 0.22))) : target
    const lag = target - this.dive > 0.02
    if (this.dive > 0.01 || lag) {
      for (let k = 0; k < n; k++) {
        const idx = this.cells[k]!
        const f = lag ? Math.max(this.dive, smooth(0.84, 0.89, calm[idx]!) * 0.9) : this.dive
        if (f > 0.01) this.colors[k] = mixPacked(this.colors[k]!, water[idx]!, f)
      }
    }
    this.count = n
    this.edgeCount = e
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
