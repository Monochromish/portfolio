import { clamp, smooth, wrapAngle } from './math'
import type { Manta } from './manta'
import { DEPTHS } from './palette'

const OUT = 0, K = 1, D = 2, BASE = 3, LIT = 4, HI = 5, M0 = 6, M1 = 7, M2 = 8, GL = 9, RIMD = 10
const SLOTS = 11
const TAU = Math.PI * 2
const wrap = (a: number) => a - TAU * Math.floor(a / TAU)

// the flap phase at which the wings lie level at the tip chord
const LEVEL = 1.232
// drawings per beat; the warp holds the two extremes about 1.9 times as long as the level passes
const KEYS = 12
const WARP = 0.15
const keyPhase = Array.from({ length: KEYS }, (_, k) => {
  const target = k * TAU / KEYS
  let p = target
  for (let i = 0; i < 8; i++) p -= (p + WARP * Math.sin(2 * p) - target) / (1 + 2 * WARP * Math.cos(2 * p))
  return p
})
function flapKey(flap: number) {
  const p = wrap(flap - LEVEL)
  const q = p + WARP * Math.sin(2 * p)
  return Math.round(q / (TAU / KEYS)) % KEYS
}

const REEF = 0, OCEANIC = 1, BLACK = 2
// a mark's seed s is 17 id + 3
const kindOf = (s: number) => [BLACK, REEF, OCEANIC][((Math.round((s - 3) / 17) % 3) + 3) % 3]!

export interface Mark { s: number, a: number, tilt: number, gray: number }

interface Held {
  L: number
  S: number
  hb: number
  bins: number
  heading: number
  fk: number
  effort: number
  bank: number
  lobe: number
  bend: number
  sleep: boolean
  night: boolean
}

const same = (a: Held, b: Held) => a.L === b.L && a.S === b.S && a.hb === b.hb && a.bins === b.bins && a.fk === b.fk && a.effort === b.effort
  && a.bank === b.bank && a.lobe === b.lobe && a.bend === b.bend && a.sleep === b.sleep && a.night === b.night

// a value keeps its step until it is three quarters of a step away; n steps to the unit
const stepped = (v: number, n: number, held?: number) => held !== undefined && Math.abs(v - held) < 0.75 / n ? held : Math.round(v * n) / n

function hold(m: Manta, night: boolean, prev: Held | null, h: Held) {
  const L = Math.round(m.L)
  // a heading bin moves the wingtips, 1.15 disc lengths out, about 1.25 cells; never fewer than 64 bins
  const bins = Math.max(64, Math.round(TAU * 1.15 * L / 1.25))
  const step = TAU / bins
  let hb = ((Math.round(wrap(m.heading) / step) % bins) + bins) % bins
  // a bin holds until the heading is three quarters of a bin past its centre
  if (prev && prev.bins === bins && Math.abs(wrapAngle(m.heading - prev.heading)) < step * 0.75) hb = prev.hb
  h.L = L
  h.S = Math.round(m.S * 100) / 100
  h.hb = hb
  h.bins = bins
  h.heading = hb * step
  h.fk = flapKey(m.flap)
  h.effort = stepped(clamp(m.effort, 0, 1), 4, prev?.effort)
  h.bank = stepped(clamp(m.bank, -0.6, 0.6), 10, prev?.bank)
  h.lobe = m.lobes < 0.3 ? 0 : m.lobes < 0.7 ? 1 : 2
  // the tail tip sets at most 0.08 disc lengths against a turn
  h.bend = stepped(clamp(-m.turn * 0.2, -0.08, 0.08), 50, prev?.bend)
  h.sleep = m.mode === 'sleep'
  h.night = night
}

// u runs from the head front (0) to the tail base (1) in disc lengths and w out from the midline. The leading edge
// leaves the head at (U_ROOT, W_ROOT) and bows out to the wingtip, w = S, at U_TIP; the trailing edge hollows back
// to (U_END, W_END) at the pelvic fins
const U_ROOT = 0.088
const W_ROOT = 0.212
const U_TIP = 0.56
const U_END = 0.925
const W_END = 0.088
// half the mouth's width, and where the wing hinges on the trunk
const MOUTH = 0.162
const HINGE = 0.2
// disc lengths a raised tip swings forward and a lowered one back per radian of tilt, and how far ahead and behind
// the cull looks for a swung wing
const UP_SWEEP = 0.16, DOWN_SWEEP = 0.05, UP_REACH = 0.11, DOWN_REACH = 0.04
const EYE_U = 0.064, EYE_W = 0.222, EYE_R = 0.021
const PEL_U = 0.958, PEL_W = 0.082, PEL_RU = 0.036, PEL_RW = 0.03

const frontSpan = (u: number, S: number) => W_ROOT + (S - W_ROOT) * Math.pow(clamp((u - U_ROOT) / (U_TIP - U_ROOT), 0, 1), 0.8)
const backSpan = (u: number, S: number) => W_END + (S - W_END) * Math.pow(clamp(1 - (u - U_TIP) / (U_END - U_TIP), 0, 1), 1.75)
function halfSpan(u: number, S: number) {
  if (u < U_ROOT || u > U_END) return -1
  return u <= U_TIP ? frontSpan(u, S) : backSpan(u, S)
}
const uFront = (w: number, S: number) => U_ROOT + (U_TIP - U_ROOT) * Math.pow(clamp((w - W_ROOT) / (S - W_ROOT), 0, 1), 1 / 0.8)
const uBack = (w: number, S: number) => U_TIP + (U_END - U_TIP) * (1 - Math.pow(clamp((w - W_END) / (S - W_END), 0, 1), 1 / 1.75))
// the mouth edge bows 0.016 forward at the midline
const headFront = (w: number) => {
  const q = w / MOUTH
  return -0.016 * (1 - Math.min(1, q * q))
}
// the head widens to the eyes at u 0.07, the trunk narrows under the wings and rounds off into the tail base
function trunkHalf(u: number) {
  if (u > 1) return -1
  if (u < 0) return MOUTH
  if (u < 0.07) return MOUTH + (0.21 - MOUTH) * Math.sqrt(u / 0.07)
  if (u < 0.6) return 0.21 - 0.04 * smooth(0.07, 0.6, u)
  if (u < 0.85) return 0.17 - 0.24 * (u - 0.6)
  const q = (u - 0.85) / 0.15
  return 0.034 + 0.076 * Math.sqrt(Math.max(0, 1 - q * q))
}

interface Edges { n: number, wMax: number, front: Float32Array, back: Float32Array, half: Float32Array }
const edgeCache = new Map<number, Edges>()
function edgeTables(S: number) {
  let e = edgeCache.get(S)
  if (e) return e
  const n = 512, wMax = S + 0.06
  const front = new Float32Array(n + 1), back = new Float32Array(n + 1), half = new Float32Array(n + 1)
  for (let i = 0; i <= n; i++) {
    front[i] = uFront(wMax * i / n, S)
    back[i] = uBack(wMax * i / n, S)
    half[i] = halfSpan(clamp(i / n, U_ROOT, U_END), S)
  }
  e = { n, wMax, front, back, half }
  edgeCache.set(S, e)
  return e
}
function table(t: Float32Array, n: number, x: number) {
  const f = clamp(x, 0, 1) * n, i = Math.min(n - 1, f | 0)
  return t[i]! + (t[i + 1]! - t[i]!) * (f - i)
}
const spanAt = (u: number, e: Edges) => u < U_ROOT || u > U_END ? -1 : table(e.half, e.n, u)

// the mound over head and trunk peaks at u 0.27 and narrows behind the shoulders into a teardrop
function moundQ(u: number, w: number) {
  const qu = (u - 0.27) / (u < 0.27 ? 0.34 : 0.56), qw = w / (0.29 * (1 - 0.5 * smooth(0.27, 0.85, u)))
  return qu * qu + qw * qw
}
// wing planes by chord fraction chi and span fraction r: a leading-edge crescent gone by 0.55 of the span, the
// plane, and a trailing membrane whose share of the chord runs straight between these (r, share) pairs
const Z_LE = 1, Z_PLANE = 2, Z_TE = 3
const MEMBRANE = new Float64Array([0, 0.38, 0.16, 0.48, 0.46, 0.52, 0.66, 0.48, 0.9, 0.3, 1, 0.16])
function membrane(r: number) {
  let i = 2
  while (i < MEMBRANE.length - 2 && MEMBRANE[i]! < r) i += 2
  const r0 = MEMBRANE[i - 2]!, w0 = MEMBRANE[i - 1]!, r1 = MEMBRANE[i]!, w1 = MEMBRANE[i + 1]!
  return Math.max(0, w0 + (w1 - w0) * clamp((r - r0) / (r1 - r0), 0, 1))
}
// no front of the shade over the back lies ahead of this u
const SHADE_MIN = U_TIP + (U_ROOT - U_TIP) * MEMBRANE.reduce((m, v, i) => i % 2 ? Math.max(m, v) : m, 0)
function zoneOf(chi: number, r: number) {
  if (chi < 0.34 * Math.pow(Math.max(0, 1 - r / 0.55), 0.7)) return Z_LE
  return chi > 1 - membrane(r) ? Z_TE : Z_PLANE
}
// the leading edge and the plane: chi and r of the middle, pitch and curl in radians
const ZONE_FORM: [number, number, number, number][] = [[0, 0, 0, 0], [0.08, 0.3, 0.5, 0], [0.45, 0.5, 0, 0]]
// the shade over the back reaches the midline at u 0.72
const ARCH_U = 0.72

// heights in disc lengths: the mound, and domes over the eyes and the pelvic fins
function surface(u: number, w: number) {
  const q = moundQ(u, w)
  let z = q < 1 ? 0.095 * Math.pow(1 - q, 1.3) : 0
  const eu = u - EYE_U, ew = w - EYE_W, e2 = (eu * eu + ew * ew) / (EYE_R * EYE_R)
  if (e2 < 1) z += 0.012 * (1 - e2)
  const pu = (u - PEL_U) / PEL_RU, pw = (w - PEL_W) / PEL_RW, p2 = pu * pu + pw * pw
  if (p2 < 1) z += 0.012 * (1 - p2)
  return z
}

interface Bezier { pts: number[], rb: number, rt: number }
function bez(b0: number[], b1: number[], b2: number[], rb: number, rt: number): Bezier {
  const pts: number[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t
    pts.push(a * b0[0]! + b * b1[0]! + c * b2[0]!, a * b0[1]! + b * b1[1]! + c * b2[1]!)
  }
  return { pts, rb, rt }
}
// cephalic fins rolled, half open and unrolled: (u, w) control points, then the radius at the root and the tip
const HORNS = [
  bez([0.014, 0.152], [-0.074, 0.166], [-0.12, 0.124], 0.027, 0.017),
  bez([0.012, 0.15], [-0.08, 0.152], [-0.142, 0.1], 0.028, 0.022),
  bez([0.012, 0.152], [-0.092, 0.148], [-0.168, 0.07], 0.034, 0.028),
]
function hornHit(u: number, w: number, h: Bezier) {
  const p = h.pts
  let best = Infinity, bt = 0, bu = 0, bw = 0, tu = 0, tw = 0
  for (let i = 0; i < p.length - 2; i += 2) {
    const au = p[i]!, aw = p[i + 1]!, du = p[i + 2]! - au, dw = p[i + 3]! - aw
    const l2 = du * du + dw * dw
    const t = clamp(((u - au) * du + (w - aw) * dw) / l2, 0, 1)
    const cu = au + du * t, cw = aw + dw * t
    const ou = u - cu, ow = w - cw, d = ou * ou + ow * ow
    if (d < best) { best = d; bt = (i / 2 + t) / 12; bu = cu; bw = cw; tu = du; tw = dw }
  }
  const r = h.rb + (h.rt - h.rb) * bt
  const d = Math.sqrt(best)
  if (d > r) return null
  const len = Math.hypot(tu, tw)
  let pu = tw / len, pw = -tu / len
  if (pw < 0) { pu = -pu; pw = -pw }
  const across = ((u - bu) * pu + (w - bw) * pw) / r
  return { t: bt, across: clamp(across, -1, 1), pu, pw }
}

// every cephalic fin lies ahead of u 0.05, from 0.03 to 0.3 off the midline
const nearHorns = (u: number, w: number) => u < 0.05 && w > 0.03 && w < 0.3

export function inside(u: number, w: number, S: number) {
  if (nearHorns(u, w) && hornHit(u, w, HORNS[0]!)) return true
  const th = trunkHalf(u), eu = u - EYE_U, ew = w - EYE_W, pu = (u - PEL_U) / PEL_RU, pw = (w - PEL_W) / PEL_RW
  if ((th > 0 && w <= th && u >= headFront(w)) || eu * eu + ew * ew <= EYE_R * EYE_R || pu * pu + pw * pw <= 1) return true
  const hs = halfSpan(u, S)
  return hs > 0 && w <= hs
}

// a shoulder mark on the right side: a closed outline clockwise from its front point, the outline segments that
// blur into the wing, and the white core along its front edge
interface PatchSpec { pts: number[][], soft: number[], core: number[][], straight: boolean }
const REEF_PATCH: PatchSpec = {
  pts: [
    [0.104, 0.208], [0.15, 0.17], [0.2, 0.127], [0.245, 0.09], [0.272, 0.066], [0.292, 0.07],
    [0.298, 0.09], [0.276, 0.134], [0.255, 0.186], [0.246, 0.238], [0.236, 0.29], [0.196, 0.308], [0.152, 0.284], [0.124, 0.244],
  ],
  soft: [6, 7, 8, 9, 10, 11],
  core: [
    [0.104, 0.208], [0.15, 0.17], [0.2, 0.127], [0.236, 0.098], [0.244, 0.112], [0.214, 0.152], [0.182, 0.196], [0.162, 0.232], [0.128, 0.238],
  ],
  straight: false,
}
// a mark sits mark.a * 0.08 disc lengths further back
const SLIDE = 0.08
const OCEANIC_PATCH: PatchSpec = {
  pts: [
    [0.136, 0.075], [0.131, 0.19], [0.128, 0.3], [0.15, 0.37], [0.185, 0.43], [0.226, 0.482], [0.229, 0.445],
    [0.222, 0.37], [0.232, 0.27], [0.25, 0.17], [0.27, 0.085],
  ],
  soft: [],
  core: [
    [0.136, 0.075], [0.131, 0.19], [0.128, 0.3], [0.15, 0.37], [0.162, 0.37], [0.172, 0.3], [0.19, 0.19],
    [0.208, 0.075],
  ],
  straight: true,
}

interface PatchGrid { u0: number, w0: number, step: number, nu: number, nw: number, cls: Uint8Array }
const P_OUT = 0, P_EDGE = 1, P_BODY = 2, P_CORE = 3

function catmull(pts: number[][], flags: boolean[] | null, straight = false) {
  const poly: number[] = [], soft: boolean[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!, p1 = pts[i]!, p2 = pts[(i + 1) % n]!, p3 = pts[(i + 2) % n]!
    for (let k = 0; k < 6; k++) {
      const t = k / 6, t2 = t * t, t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => straight
        ? b + (c - b) * t
        : 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      poly.push(f(p0[0]!, p1[0]!, p2[0]!, p3[0]!), f(p0[1]!, p1[1]!, p2[1]!, p3[1]!))
      soft.push(flags ? flags[i]! : false)
    }
  }
  return { poly, soft }
}
function crossings(poly: number[], w: number, out: Float64Array) {
  let n = 0
  const m = poly.length / 2
  for (let i = 0, j = m - 1; i < m; j = i++) {
    const ui = poly[2 * i]!, wi = poly[2 * i + 1]!, uj = poly[2 * j]!, wj = poly[2 * j + 1]!
    if ((wi > w) !== (wj > w)) out[n++] = (uj - ui) * (w - wi) / (wj - wi) + ui
  }
  return n
}
const within = (u: number, xs: Float64Array, n: number) => {
  let odd = false
  for (let q = 0; q < n; q++) if (u < xs[q]!) odd = !odd
  return odd
}

// sampled every 0.004 disc lengths; the blurred margin is widest halfway along the soft run, 0.028 at most
function patchGrid(spec: PatchSpec, mark: Mark, side: number): PatchGrid {
  const grow = (1 - 0.18 * mark.gray) * (side < 0 ? 0.96 : 1)
  const turn = (mark.tilt + (side < 0 ? 0.04 : 0)) * 0.3
  const [fu, fw] = spec.pts[0]! as [number, number]
  const place = (pts: number[][]) => pts.map(([u, w]) => {
    const du = (u! - fu) * grow, dw = (w! - fw) * grow
    return [fu + mark.a * SLIDE + du * Math.cos(turn) - dw * Math.sin(turn), fw + du * Math.sin(turn) + dw * Math.cos(turn)]
  })
  const outline = catmull(place(spec.pts), spec.pts.map((_, i) => spec.soft.includes(i)), spec.straight)
  const core = spec.core.length ? catmull(place(spec.core), null, spec.straight).poly : null
  const softIdx: number[] = []
  for (let i = 0; i < outline.soft.length; i++) if (outline.soft[i]) softIdx.push(i)
  let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity
  for (let i = 0; i < outline.poly.length; i += 2) {
    u0 = Math.min(u0, outline.poly[i]!); u1 = Math.max(u1, outline.poly[i]!)
    w0 = Math.min(w0, outline.poly[i + 1]!); w1 = Math.max(w1, outline.poly[i + 1]!)
  }
  const step = 0.004
  u0 -= 0.02; w0 -= 0.02; u1 += 0.02; w1 += 0.02
  const nu = Math.ceil((u1 - u0) / step) + 1, nw = Math.ceil((w1 - w0) / step) + 1
  const cls = new Uint8Array(nu * nw)
  const P = outline.poly, n2 = P.length / 2
  const xo = new Float64Array(n2), xc = new Float64Array(core ? core.length / 2 : 0)
  for (let c = 0; c < nw; c++) {
    const w = w0 + c * step
    const no = crossings(P, w, xo), nc = core ? crossings(core, w, xc) : 0
    for (let a = 0; a < nu; a++) {
      const u = u0 + a * step
      if (!within(u, xo, no)) continue
      let k: number = P_BODY
      if (within(u, xc, nc)) k = P_CORE
      else if (softIdx.length) {
        let best = Infinity, bt = 0
        for (let q = 0; q < softIdx.length; q++) {
          const j = softIdx[q]!, i = (j + 1) % n2
          const uj = P[2 * j]!, wj = P[2 * j + 1]!, du = P[2 * i]! - uj, dw = P[2 * i + 1]! - wj
          const l2 = du * du + dw * dw
          const t = clamp(((u - uj) * du + (w - wj) * dw) / l2, 0, 1)
          const eu = u - uj - du * t, ew = w - wj - dw * t, d = eu * eu + ew * ew
          if (d < best) { best = d; bt = (q + t) / softIdx.length }
        }
        const width = 0.028 * Math.pow(Math.sin(Math.PI * bt), 0.8)
        if (Math.sqrt(best) < width) k = P_EDGE
      }
      cls[a * nw + c] = k
    }
  }
  return { u0, w0, step, nu, nw, cls }
}
function patchesFor(mark: Mark) {
  const kind = kindOf(mark.s)
  const spec = kind === REEF ? REEF_PATCH : kind === OCEANIC ? OCEANIC_PATCH : null
  return spec ? [patchGrid(spec, mark, -1), patchGrid(spec, mark, 1)] : null
}
function patchAt(u: number, w: number, P: PatchGrid) {
  const a = Math.round((u - P.u0) / P.step), c = Math.round((w - P.w0) / P.step)
  if (a < 0 || c < 0 || a >= P.nu || c >= P.nw) return P_OUT
  return P.cls[a * P.nw + c]!
}

interface Look { planes: number[], patch: boolean[], ridge: number }
// x, y offsets from the rounded position and the slot of every cell, body cells first
interface Sprite { xy: Int16Array, tone: Uint8Array, body: number, held: Held, look: Look }

const M_OUT = 0, M_DISC = 1, M_LOBE = 2, M_MARK = 3, M_FIX = 4

const grid = (n: number) => ({
  slot: new Uint8Array(n), mat: new Uint8Array(n), aux: new Int32Array(n), z: new Float32Array(n), gx: new Float32Array(n), gy: new Float32Array(n),
  pu: new Float32Array(n), pw: new Float32Array(n), lit: new Float32Array(n), pcls: new Uint8Array(n), pside: new Uint8Array(n), zone: new Uint8Array(n),
  marks: new Int32Array(n), runH: new Uint8Array(n), runV: new Uint8Array(n), next: new Uint8Array(n), stack: new Int32Array(n), members: new Int32Array(n),
})
let buf = { w: 0, h: 0, ...grid(0) }
function scratch(w: number, h: number) {
  if (buf.slot.length < w * h) buf = { w, h, ...grid(w * h * 2) }
  buf.w = w
  buf.h = h
  const n = w * h
  buf.slot.fill(0, 0, n)
  buf.mat.fill(0, 0, n)
  buf.gx.fill(0, 0, n)
  buf.gy.fill(0, 0, n)
  buf.pcls.fill(0, 0, n)
  buf.zone.fill(0, 0, n)
  buf.pu.fill(0, 0, n)
  buf.pw.fill(0, 0, n)
  return buf
}
export function release() {
  buf = { w: 0, h: 0, ...grid(0) }
}

const STEPS = [0.38, 0.6, 0.78, 0.95]
const toneOf = (val: number) => val >= STEPS[3]! ? HI : val >= STEPS[2]! ? LIT : val >= STEPS[1]! ? BASE : val >= STEPS[0]! ? D : K
// a tone keeps the previous one while the light sits within band, 0.025 unless given, of the step between them
function toneHeld(val: number, prev: number, band = 0.025) {
  const t = toneOf(val)
  if (!prev || t === prev || Math.abs(t - prev) > 1) return t
  return Math.abs(val - STEPS[Math.min(t, prev) - 1]!) < band ? prev : t
}

// wing tilt over u from U0 to U1 and span fraction r: droop at the tip, and how far the tip lags the root in phase
const DROOP = 0.05, LAG = 0.55
const NU = 64, NR = 32, U0 = -0.05, U1 = 1
// planes and the light on the wings read a wing's tilt at 0.45 of its strength
const TILT = 0.45
const ANG = new Float32Array((NU + 1) * (NR + 1))

function render(h: Held, mark: Mark, light: number[], prev: Look | null, patches: PatchGrid[] | null): Sprite {
  const { L, S } = h
  const c = Math.cos(h.heading), s = Math.sin(h.heading)
  const lF = light[0]! * c + light[1]! * s, lR = -light[0]! * s + light[1]! * c, lZ = light[2]!
  const amp = 0.33 + 0.385 * h.effort
  const flap = LEVEL + keyPhase[h.fk]!
  const large = L >= 58, small = L < 40
  const kind = kindOf(mark.s)
  for (let a = 0; a <= NU; a++) {
    const u = U0 + (U1 - U0) * a / NU
    for (let q = 0; q <= NR; q++) {
      const r = q / NR
      ANG[a * (NR + 1) + q] = amp * Math.sin(flap - 2.2 * u - LAG * (r - 1)) * Math.pow(r, 1.25) + DROOP * r * r
    }
  }
  const span = S - HINGE
  const wingAngle = (u: number, w: number, side: number) => {
    const r = clamp((w - HINGE) / span, 0, 1)
    const fu = clamp((u - U0) / (U1 - U0), 0, 1) * NU, fr = r * NR
    const a = Math.min(NU - 1, fu | 0), q = Math.min(NR - 1, fr | 0)
    const tu = fu - a, tr = fr - q, o = a * (NR + 1) + q
    const v0 = ANG[o]! + (ANG[o + 1]! - ANG[o]!) * tr, v1 = ANG[o + NR + 1]! + (ANG[o + NR + 2]! - ANG[o + NR + 1]!) * tr
    return v0 + (v1 - v0) * tu + side * h.bank * r
  }
  const edges = edgeTables(S)
  const memFront = (w: number) => {
    const uf = table(edges.front, edges.n, w / edges.wMax), ub = table(edges.back, edges.n, w / edges.wMax)
    return uf + (1 - membrane(clamp((w - HINGE) / span, 0, 1))) * (ub - uf)
  }
  const hingeFront = memFront(HINGE)
  const shadeFront = (w: number) => {
    if (w >= HINGE) return memFront(w)
    const q = w / HINGE
    return hingeFront + (ARCH_U - hingeFront) * Math.sqrt(1 - q * q)
  }

  // ahead to the fin tips, behind past the pelvic fins, out to the wingtips
  const ahead = 0.66 * L, behind = 0.58 * L, half = (S + 0.04) * L
  const corners = [[ahead, half], [ahead, -half], [-behind, -half], [-behind, half]].map(([a, l]) => [c * a! - s * l!, s * a! + c * l!])
  const bx0 = Math.floor(Math.min(...corners.map(p => p[0]!))) - 2, bx1 = Math.ceil(Math.max(...corners.map(p => p[0]!))) + 2
  const by0 = Math.floor(Math.min(...corners.map(p => p[1]!))) - 2, by1 = Math.ceil(Math.max(...corners.map(p => p[1]!))) + 2
  const W = bx1 - bx0 + 1, H = by1 - by0 + 1
  const b = scratch(W, H)
  const { slot, mat, z, gx, gy, pu, pw, lit, pcls, pside, zone } = b
  const horn = HORNS[h.lobe]!

  // planes hold their tone within 0.06 of a step
  const zoneTone = [new Uint8Array(4), new Uint8Array(4)]
  const planes: number[] = []
  const lightOf = (zi: number, side: number) => {
    const [zc, zr, pitch, curl] = ZONE_FORM[zi]!
    const w = HINGE + zr * span
    const uf = uFront(w, S), ub = uBack(w, S)
    const a = TILT * wingAngle(uf + zc * (ub - uf), w, side) + curl
    return Math.sin(pitch) * lF + side * Math.sin(a) * Math.cos(pitch) * lR + Math.cos(a) * Math.cos(pitch) * lZ
  }
  for (const side of [-1, 1]) {
    const q = planes.length
    const plane = Math.max(D, toneHeld(lightOf(Z_PLANE, side), prev ? prev.planes[q + 1]! : 0, 0.06))
    const le = Math.max(plane, toneHeld(lightOf(Z_LE, side), prev ? prev.planes[q]! : 0, 0.06))
    const zt = zoneTone[side > 0 ? 1 : 0]!
    zt[Z_LE] = le
    zt[Z_PLANE] = plane
    zt[Z_TE] = D
    planes.push(le, plane, D)
  }
  // the side of the head facing the sun, held while the sun is within 0.2 of the midline
  const ridge = prev && Math.abs(lR) < 0.2 ? prev.ridge : lR < 0 ? -1 : 1
  const look: Look = { planes, patch: prev ? prev.patch : [true, true], ridge }
  const near = ridge > 0 ? 1 : 0, wm = HINGE + 0.66 * span
  let ti0 = W, ti1 = -1, tj0 = H, tj1 = -1

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const dx = bx0 + i + 0.5, dy = by0 + j + 0.5
      let u = 0.45 - (dx * c + dy * s) / L
      const fw = (-dx * s + dy * c) / L
      const side = fw < 0 ? -1 : 1
      const aw = fw * side
      if (u < -0.25 || u > 1.02 || aw > S + 0.05) continue
      const k = j * W + i
      if (nearHorns(u, aw)) {
        const hit = hornHit(u, aw, horn)
        if (hit) {
          const a = h.lobe === 0 ? hit.across : 0.35 + 0.4 * hit.across
          const sn = Math.sqrt(Math.max(0, 1 - a * a))
          const nF = -hit.pu * a, nR = side * hit.pw * a
          const val = nF * lF + nR * lR + sn * lZ + 0.06
          mat[k] = M_LOBE
          slot[k] = kind === REEF && !small && hit.across < -0.45 && hit.t > 0.15 ? M0 : toneOf(val)
          pu[k] = u
          pw[k] = aw
          continue
        }
      }
      const th = trunkHalf(u)
      const eu = u - EYE_U, ew = aw - EYE_W
      const inEye = eu * eu + ew * ew <= EYE_R * EYE_R
      const inTrunk = (th > 0 && aw <= th && u >= headFront(aw)) || inEye
      const qu = (u - PEL_U) / PEL_RU, qw = (aw - PEL_W) / PEL_RW
      const inPelvic = qu * qu + qw * qw <= 1
      const reach = u - DOWN_REACH <= U_TIP && u + UP_REACH >= U_TIP ? S : Math.max(spanAt(u - DOWN_REACH, edges), spanAt(u + UP_REACH, edges))
      if (!inTrunk && !inPelvic && (reach < 0 || aw > reach)) continue
      let w = aw, uw = u
      if (!inTrunk && aw > HINGE) {
        for (let it = 0; it < 2; it++) {
          const a = wingAngle(uw, w, side)
          w = aw / Math.max(0.3, Math.cos(a))
          const r = clamp((w - HINGE) / span, 0, 1)
          uw = u + (a < 0 ? UP_SWEEP * r * r * -a : -DOWN_SWEEP * r * r * a)
        }
      }
      const hs = spanAt(uw, edges)
      const inWing = hs > 0 && w <= hs
      if (!inTrunk && !inWing && !inPelvic) continue
      if (!inTrunk && !inPelvic) u = uw
      mat[k] = M_DISC
      z[k] = surface(u, w) * L
      pu[k] = u
      pw[k] = w
      pside[k] = side > 0 ? 1 : 0
      if (!inTrunk && w > HINGE) {
        const t = TILT * Math.tan(wingAngle(u, w, side))
        gx[k] = side * s * t
        gy[k] = -side * c * t
        if (moundQ(u, w) >= 1) {
          const r = clamp((w - HINGE) / span, 0, 1)
          const uf = table(edges.front, edges.n, w / edges.wMax), ub = table(edges.back, edges.n, w / edges.wMax)
          zone[k] = zoneOf(clamp((u - uf) / Math.max(0.02, ub - uf), 0, 1), r)
          if (zone[k] === Z_TE && pside[k] === near && w >= wm) {
            ti0 = Math.min(ti0, i)
            ti1 = Math.max(ti1, i)
            tj0 = Math.min(tj0, j)
            tj1 = Math.max(tj1, j)
          }
        }
      }
      if (patches && w > 0.05 && w < 0.56 && u > 0.08 && u < 0.42) pcls[k] = patchAt(u, w, patches[side > 0 ? 1 : 0]!)
    }
  }

  const lx = light[0]!, ly = light[1]!, lz = light[2]!
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i
      if (mat[k] !== M_DISC || (zone[k] && !pcls[k])) continue
      const zl = i > 0 && mat[k - 1] === M_DISC ? z[k - 1]! : z[k]!, zr = i < W - 1 && mat[k + 1] === M_DISC ? z[k + 1]! : z[k]!
      const zu = j > 0 && mat[k - W] === M_DISC ? z[k - W]! : z[k]!, zd = j < H - 1 && mat[k + W] === M_DISC ? z[k + W]! : z[k]!
      const hx = (zr - zl) / 2 + gx[k]!, hy = (zd - zu) / 2 + gy[k]!
      lit[k] = (-hx * lx - hy * ly + lz) / Math.sqrt(hx * hx + hy * hy + 1)
    }
  }
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i
      if (mat[k] !== M_DISC) continue
      if (zone[k]) {
        slot[k] = zoneTone[pside[k]!]![zone[k]!]!
        continue
      }
      let sum = 0, n = 0
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          const ii = i + x, jj = j + y
          if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue
          const q = jj * W + ii
          if (mat[q] === M_DISC && !zone[q]) { sum += lit[q]!; n++ }
        }
      }
      slot[k] = pu[k]! > SHADE_MIN && pu[k]! > shadeFront(pw[k]!) ? D : Math.max(BASE, toneOf(sum / n))
    }
  }

  thinMerge(b)
  cleanSilhouette(b)
  cleanTones(b, large ? 8 : small ? 3 : 5)

  if (patches) {
    const sum = [0, 0], count = [0, 0]
    for (let k = 0; k < W * H; k++) {
      if (mat[k] !== M_DISC || pcls[k] === P_OUT) continue
      count[pside[k]!]!++
      sum[pside[k]!]! += lit[k]!
    }
    // a side is lit past 0.7, held within 0.03 of it
    const litSide = [0, 1].map((q) => {
      const v = sum[q]! / Math.max(1, count[q]!)
      return prev && Math.abs(v - 0.7) < 0.03 ? prev.patch[q]! : v >= 0.7
    })
    look.patch = litSide
    const picked = b.marks
    let marked = 0
    for (let k = 0; k < W * H; k++) {
      if (mat[k] !== M_DISC || pcls[k] === P_OUT) continue
      const on = litSide[pside[k]!]!
      const cl = pcls[k]!
      if (small) slot[k] = on ? M1 : M0
      else if (cl === P_CORE) slot[k] = on ? M2 : M1
      else if (cl === P_BODY) slot[k] = on ? M1 : M0
      else slot[k] = on ? M0 : LIT
      mat[k] = M_MARK
      picked[marked++] = k
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let q = 0; q < marked; q++) {
        const k = picked[q]!, i = k % W, j = (k - i) / W
        const n = inner4(mat, k, i, j, W, H)
        let kin = false, marks = 0
        for (let a = 0; a < n; a++) {
          if (slot[NB[a]!] === slot[k]) kin = true
          if (mat[NB[a]!] === M_MARK) NB[marks++] = NB[a]!
        }
        if (!kin && marks) slot[k] = majorityOf(slot, marks)
      }
    }
  }

  const ln = Math.hypot(lx, ly)
  const sx = lx / ln, sy = ly / ln
  highlight(b, pw, S, sx, sy, h.night, small)

  const at = (u: number, w: number) => {
    const a = (0.45 - u) * L, l = w * L
    return [Math.floor(c * a - s * l - bx0), Math.floor(s * a + c * l - by0)]
  }
  const put = (p: number[], sl: number, onlyInside = true) => {
    const [i, j] = p as [number, number]
    if (i < 0 || j < 0 || i >= W || j >= H) return
    const k = j * W + i
    if (onlyInside && mat[k] === M_OUT) return
    slot[k] = sl
    mat[k] = M_FIX
  }
  for (const side of [-1, 1]) {
    const e = at(EYE_U + 0.004, side * (EYE_W - 0.002))
    const back = Math.abs(c) > Math.abs(s) ? [-Math.sign(c), 0] : [0, -Math.sign(s)]
    if (h.sleep) {
      put(e, D)
      if (!small) put([e[0]! + back[0]!, e[1]! + back[1]!], D)
    }
    else {
      put(e, K)
      if (!small) put([e[0]! + back[0]!, e[1]! + back[1]!], K)
      if (large) {
        const g = Math.abs(sx) > Math.abs(sy) ? [Math.sign(sx), 0] : [0, Math.sign(sy)]
        put([e[0]! + g[0]!, e[1]! + g[1]!], GL)
      }
    }
  }
  // two cells of the sunlit wing's trailing edge catch the light 0.66 of the way out
  const membraneCell = (k: number) => zone[k] === Z_TE && mat[k] !== M_OUT && mat[k] !== M_FIX && pside[k] === near
  let first = -1
  for (let j = tj0; j <= tj1; j++) {
    for (let i = ti0; i <= ti1; i++) {
      const k = j * W + i
      if (membraneCell(k) && pw[k]! >= wm && onEdge(b, i, j) && (first < 0 || pw[k]! < pw[first]!)) first = k
    }
  }
  if (first >= 0) {
    const i = first % W, j = (first - i) / W
    let next = -1, best = -1
    for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue
      const q = jj * W + ii
      if (!membraneCell(q)) continue
      const score = (onEdge(b, ii, jj) ? 2 : 0) + pw[q]!
      if (score > best) {
        best = score
        next = q
      }
    }
    for (const k of next < 0 ? [first] : [first, next]) {
      slot[k] = h.night ? HI : LIT
      mat[k] = M_FIX
    }
  }
  if (kind === REEF && !small) {
    // the patch's tip, just behind and inside its front point
    const [fu, fw] = REEF_PATCH.pts[0]! as [number, number]
    for (const side of [-1, 1]) put(at(fu + 0.004 + mark.a * SLIDE, side * (fw - 0.002)), M2)
  }
  // the mouth line 0.7 cells inside the front edge, and a second line 1.7 cells in while feeding
  const mouth: number[][] = []
  for (let q = -4; q <= 4; q++) {
    const w = (q / 4) * (MOUTH - 0.034)
    mouth.push(at(headFront(w) + 0.7 / L, w))
  }
  const mouthLine = pixelPerfect(dedupe(mouth))
  for (const p of mouthLine) put(p, K)
  // the mouth's corners catch the light, two cells each from L 40
  const lip = small ? 1 : 2
  for (let t = 0; t < lip && 2 * t < mouthLine.length - 2; t++) {
    put(mouthLine[t]!, ridge < 0 ? HI : h.night ? RIMD : LIT)
    put(mouthLine[mouthLine.length - 1 - t]!, ridge > 0 ? HI : h.night ? RIMD : LIT)
  }
  // around the fin roots, u -0.02 to 0.12, a lone cell or a sliver of two takes the skin's tone beside it
  const root = (k: number) => (mat[k] === M_DISC || mat[k] === M_LOBE) && pu[k]! >= -0.02 && pu[k]! <= 0.12
  const runOf = (k: number, i: number, j: number, horiz: boolean) => {
    let n = 1
    const t = slot[k]!, d = horiz ? 1 : W
    for (let a = 1; a < 3; a++) {
      const q = k - a * d
      if ((horiz ? i - a < 0 : j - a < 0) || mat[q] === M_OUT || slot[q] !== t) break
      n++
    }
    for (let a = 1; a < 3; a++) {
      const q = k + a * d
      if ((horiz ? i + a >= W : j + a >= H) || mat[q] === M_OUT || slot[q] !== t) break
      n++
    }
    return n
  }
  // every fin root cell lies within u -0.14 to 0.17 and 0.34 either side of the midline
  let ri0 = W - 1, ri1 = 0, rj0 = H - 1, rj1 = 0
  for (const u of [-0.14, 0.17]) {
    for (const w of [-0.34, 0.34]) {
      const [i, j] = at(u, w) as [number, number]
      ri0 = Math.min(ri0, i)
      ri1 = Math.max(ri1, i)
      rj0 = Math.min(rj0, j)
      rj1 = Math.max(rj1, j)
    }
  }
  ri0 = Math.max(0, ri0 - 1)
  ri1 = Math.min(W - 1, ri1 + 1)
  rj0 = Math.max(0, rj0 - 1)
  rj1 = Math.min(H - 1, rj1 + 1)
  for (let pass = 0; pass < 2; pass++) {
    for (let j = rj0; j <= rj1; j++) {
      for (let i = ri0; i <= ri1; i++) {
        const k = j * W + i
        if (!root(k)) continue
        const n = inner4(mat, k, i, j, W, H)
        let kin = false, m = 0
        for (let a = 0; a < n; a++) {
          if (slot[NB[a]!] === slot[k]) kin = true
          if (mat[NB[a]!] !== M_FIX) NB[m++] = NB[a]!
        }
        if (!kin && m) slot[k] = majorityOf(slot, m)
        else if (kin && runOf(k, i, j, true) <= 2 && runOf(k, i, j, false) <= 2) {
          const kept = m
          m = 0
          for (let a = 0; a < kept; a++) {
            const q = NB[a]!, qi = q % W, qj = (q - qi) / W
            if (mat[q] !== M_FIX && slot[q] !== slot[k] && (runOf(q, qi, qj, true) > 2 || runOf(q, qi, qj, false) > 2)) NB[m++] = q
          }
          if (m) slot[k] = majorityOf(slot, m)
        }
      }
    }
  }
  if (h.lobe === 2) {
    const deep: number[][] = []
    for (let q = -4; q <= 4; q++) {
      const w = (q / 4) * (MOUTH - 0.05)
      deep.push(at(headFront(w) + 1.7 / L, w))
    }
    for (const p of pixelPerfect(dedupe(deep))) put(p, kind === REEF ? M0 : D)
  }

  // the dorsal fin on the midline from u 0.965 to the tail base
  if (!small) {
    const f0 = at(0.965, 0), f1 = at(1, 0)
    line(f0, f1, p => put(p, LIT, false))
    const away = Math.abs(sx) > Math.abs(sy) ? [Math.sign(-sx), 0] : [0, Math.sign(-sy)]
    put([f1[0]! + away[0]!, f1[1]! + away[1]!], K, false)
  }

  // the tail runs 0.6 disc lengths past the base, two cells across for its first fifth
  const tail: number[] = []
  const add = (i: number, j: number, t: number) => {
    for (let q = 0; q < tail.length; q += 3) {
      if (tail[q] === i && tail[q + 1] === j) {
        tail[q + 2] = t
        return
      }
    }
    tail.push(i, j, t)
  }
  const pts: number[][] = []
  const n = Math.ceil(0.62 * L * 3)
  for (let q = 0; q <= n; q++) {
    const t = q / n
    pts.push(at(1 + 0.6 * t, h.bend * t * t))
  }
  const cells = pixelPerfect(dedupe(pts))
  const thick = small ? 0 : Math.round(cells.length * 0.2)
  const tailTone = h.night ? RIMD : D, tailLit = h.night ? LIT : BASE
  cells.forEach((p, q) => {
    const [i, j] = p as [number, number]
    if (i >= 0 && j >= 0 && i < W && j < H && mat[j * W + i] !== M_OUT) return
    add(i, j, tailTone)
    if (q < thick) {
      const dirx = Math.abs(c) > Math.abs(s) ? 0 : 1
      const ox = dirx ? Math.sign(sx) || -1 : 0, oy = dirx ? 0 : Math.sign(sy) || -1
      const ii = i + ox, jj = j + oy
      if (!(ii >= 0 && jj >= 0 && ii < W && jj < H && mat[jj * W + ii] !== M_OUT)) add(ii, jj, tailLit)
    }
  })

  let body = 0
  for (let k = 0; k < W * H; k++) if (slot[k]) body++
  const xy = new Int16Array((body + tail.length / 3) * 2), tone = new Uint8Array(body + tail.length / 3)
  let o = 0
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const sl = slot[j * W + i]!
      if (!sl) continue
      xy[2 * o] = bx0 + i
      xy[2 * o + 1] = by0 + j
      tone[o++] = sl
    }
  }
  for (let t = 0; t < tail.length; t += 3) {
    xy[2 * o] = bx0 + tail[t]!
    xy[2 * o + 1] = by0 + tail[t + 1]!
    tone[o++] = tail[t + 2]!
  }
  return { xy, tone, body, held: { ...h }, look }
}

// edges facing the light get a highlight two cells deep where they face it squarely and one where they turn,
// none past 0.62 of the span and at most one past 0.42 (0.9 and 0.74 by night); by night the far edges carry the
// rim tone
function highlight(b: typeof buf, pw: Float32Array, S: number, sx: number, sy: number, night: boolean, small: boolean) {
  const { w: W, h: H, mat, slot } = b
  const marks: number[] = []
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i
      if (mat[k] === M_OUT || !onEdge(b, i, j)) continue
      let nx = 0, ny = 0
      for (let y = -3; y <= 3; y++) {
        for (let x = -3; x <= 3; x++) {
          if (x * x + y * y > 10) continue
          const ii = i + x, jj = j + y
          if (ii < 0 || jj < 0 || ii >= W || jj >= H || mat[jj * W + ii] === M_OUT) { nx += x; ny += y }
        }
      }
      const n = Math.hypot(nx, ny) || 1
      nx /= n
      ny /= n
      const facing = nx * sx + ny * sy
      let depth = facing > 0.8 ? 2 : facing > 0.36 ? 1 : 0
      const r = pw[k]! / S
      if (mat[k] === M_DISC && r > (night ? 0.9 : 0.62)) depth = 0
      else if (mat[k] === M_DISC && r > (night ? 0.74 : 0.42)) depth = Math.min(depth, 1)
      if (small || mat[k] === M_LOBE) depth = Math.min(depth, 1)
      marks.push(k, depth, facing > 0.66 ? HI : LIT, Math.round(-nx), Math.round(-ny))
    }
  }
  const inner: number[] = []
  for (let q = 0; q < marks.length; q += 5) {
    const k = marks[q]!, depth = marks[q + 1]!, tone = marks[q + 2]!
    const i = k % W, j = (k - i) / W
    if (depth === 0) {
      if (night && mat[k] !== M_MARK) {
        slot[k] = RIMD
        mat[k] = M_FIX
      }
      continue
    }
    if (mat[k] === M_MARK) continue
    slot[k] = depth === 2 || night ? HI : tone
    mat[k] = M_FIX
    if (depth === 2) {
      const ii = i + marks[q + 3]!, jj = j + marks[q + 4]!
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue
      const kk = jj * W + ii
      if (mat[kk] === M_DISC || mat[kk] === M_LOBE) {
        inner.push(kk, slot[kk]!, mat[kk]!)
        slot[kk] = night ? RIMD : LIT
        mat[kk] = M_FIX
      }
    }
  }
  const lone: number[] = []
  for (let q = 0; q < inner.length; q += 3) {
    const k = inner[q]!, i = k % W, j = (k - i) / W, t = slot[k]!
    if (!((i > 0 && slot[k - 1] === t) || (i < W - 1 && slot[k + 1] === t) || (j > 0 && slot[k - W] === t) || (j < H - 1 && slot[k + W] === t))) lone.push(q)
  }
  for (const q of lone) {
    slot[inner[q]!] = inner[q + 1]!
    mat[inner[q]!] = inner[q + 2]!
  }
}

function onEdge(b: typeof buf, i: number, j: number) {
  const { w, h, mat } = b
  return i === 0 || j === 0 || i === w - 1 || j === h - 1
    || mat[j * w + i - 1] === M_OUT || mat[j * w + i + 1] === M_OUT || mat[(j - 1) * w + i] === M_OUT || mat[(j + 1) * w + i] === M_OUT
}

const NB = new Int32Array(4)
function inner4(mat: Uint8Array, k: number, i: number, j: number, w: number, h: number) {
  let n = 0
  if (i > 0 && mat[k - 1] !== M_OUT) NB[n++] = k - 1
  if (i < w - 1 && mat[k + 1] !== M_OUT) NB[n++] = k + 1
  if (j > 0 && mat[k - w] !== M_OUT) NB[n++] = k - w
  if (j < h - 1 && mat[k + w] !== M_OUT) NB[n++] = k + w
  return n
}
function majorityOf(slot: Uint8Array, n: number) {
  let best = slot[NB[0]!]!, count = 0
  for (let a = 0; a < n; a++) {
    const t = slot[NB[a]!]!
    let c = 0
    for (let q = 0; q < n; q++) if (slot[NB[q]!] === t) c++
    if (c > count || (c === count && t < best)) { best = t; count = c }
  }
  return best
}

function cleanSilhouette(b: typeof buf) {
  const { w, h, mat, slot } = b
  for (let pass = 0; pass < 3; pass++) {
    let changed = 0
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i
        const n = inner4(mat, k, i, j, w, h)
        if (mat[k] !== M_OUT && n <= 1) {
          mat[k] = M_OUT
          slot[k] = OUT
          changed++
        }
        else if (mat[k] === M_OUT && n >= 3) {
          mat[k] = mat[NB[0]!]!
          slot[k] = majorityOf(slot, n)
          changed++
        }
      }
    }
    if (!changed) break
  }
}

// a band cell whose own tone runs two cells or fewer both across and down takes its thicker neighbours' tone
const VOTES = new Int32Array(SLOTS)
function thinMerge(b: typeof buf) {
  const { w, h, mat, slot, runH, runV, next } = b
  const N = w * h
  for (let j = 0; j < h; j++) {
    let i = 0
    while (i < w) {
      const k = j * w + i
      if (mat[k] !== M_DISC) { i++; continue }
      let e = i + 1
      while (e < w && mat[j * w + e] === M_DISC && slot[j * w + e] === slot[k]) e++
      for (let x = i; x < e; x++) runH[j * w + x] = Math.min(255, e - i)
      i = e
    }
  }
  for (let i = 0; i < w; i++) {
    let j = 0
    while (j < h) {
      const k = j * w + i
      if (mat[k] !== M_DISC) { j++; continue }
      let e = j + 1
      while (e < h && mat[e * w + i] === M_DISC && slot[e * w + i] === slot[k]) e++
      for (let y = j; y < e; y++) runV[y * w + i] = Math.min(255, e - j)
      j = e
    }
  }
  next.set(slot.subarray(0, N))
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      if (mat[k] !== M_DISC || Math.min(runH[k]!, runV[k]!) > 2) continue
      VOTES.fill(0)
      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          const ii = i + x, jj = j + y
          if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue
          const q = jj * w + ii
          if (mat[q] !== M_DISC || slot[q] === slot[k] || Math.min(runH[q]!, runV[q]!) <= 2) continue
          VOTES[slot[q]!]!++
        }
      }
      let best = -1, bn = 0
      for (let t = 1; t < SLOTS; t++) if (VOTES[t]! > bn) { best = t; bn = VOTES[t]! }
      if (best > 0) next[k] = best
    }
  }
  slot.set(next.subarray(0, N))
}

const BORDER = new Int32Array(SLOTS)
function cleanTones(b: typeof buf, minCluster: number) {
  const { w, h, mat, slot, aux, stack, members } = b
  const N = w * h
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i
        if (mat[k] !== M_DISC) continue
        const n = inner4(mat, k, i, j, w, h)
        let kin = false
        for (let a = 0; a < n; a++) if (slot[NB[a]!] === slot[k]) kin = true
        if (!kin && n) slot[k] = majorityOf(slot, n)
      }
    }
  }
  aux.fill(-1, 0, N)
  for (let k0 = 0; k0 < N; k0++) {
    if (aux[k0] !== -1 || mat[k0] !== M_DISC) continue
    const tone = slot[k0]!
    let sp = 0, mp = 0
    stack[sp++] = k0
    aux[k0] = k0
    BORDER.fill(0)
    while (sp) {
      const k = stack[--sp]!
      members[mp++] = k
      const i = k % w, j = (k - i) / w
      const n = inner4(mat, k, i, j, w, h)
      for (let a = 0; a < n; a++) {
        const q = NB[a]!, t = slot[q]!
        if (t === tone) {
          if (mat[q] === M_DISC && aux[q] === -1) {
            aux[q] = k0
            stack[sp++] = q
          }
        }
        else if (mat[q] === M_DISC) BORDER[t]!++
      }
    }
    if (mp < minCluster) {
      let best = -1, bn = 0
      for (let t = 1; t < SLOTS; t++) if (BORDER[t]! > bn) { best = t; bn = BORDER[t]! }
      if (best > 0) for (let m = 0; m < mp; m++) slot[members[m]!] = best
    }
  }
}

function line(a: number[], b: number[], fn: (p: number[]) => void) {
  let x0 = a[0]!, y0 = a[1]!
  const x1 = b[0]!, y1 = b[1]!
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    fn([x0, y0])
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

function dedupe(pts: number[][]) {
  const out: number[][] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && last[0] === p[0] && last[1] === p[1]) continue
    if (last && (Math.abs(last[0]! - p[0]!) > 1 || Math.abs(last[1]! - p[1]!) > 1)) {
      line(last, p, (q) => {
        const l2 = out[out.length - 1]!
        if (l2[0] !== q[0] || l2[1] !== q[1]) out.push(q)
      })
    }
    else out.push(p)
  }
  return out
}

function pixelPerfect(cells: number[][]) {
  const out: number[][] = []
  for (const p of cells) {
    out.push(p)
    while (out.length >= 3) {
      const a = out[out.length - 3]!, m = out[out.length - 2]!, z = out[out.length - 1]!
      if (Math.abs(a[0]! - z[0]!) === 1 && Math.abs(a[1]! - z[1]!) === 1 && (m[0] === a[0] || m[1] === a[1])) out.splice(out.length - 2, 1)
      else break
    }
  }
  return out
}

// the depth veil's level: none at depth 0.92 and above, the deepest at 0.55
function depthLevel(depth: number) {
  const t = clamp((0.92 - depth) / 0.37, 0, 1)
  return t * t * (DEPTHS - 1)
}

// ticks a second of the drawing clock; a turn of more than 5 degrees a tick also draws on the half tick
const RATE = 10
const QUICK = 5 * Math.PI / 180 * RATE

export class Drawing {
  sprite: Sprite | null = null
  level = 0
  private t = 0
  private half = -1
  private due = false
  private levelTick = 0
  private want: Held = { L: 0, S: 0, hb: 0, bins: 0, heading: 0, fk: 0, effort: 0, bank: 0, lobe: 0, bend: 0, sleep: false, night: false }
  private mark: Mark | null = null
  private patches: PatchGrid[] | null = null

  update(m: Manta, light: number[], night: boolean, t: number, spare: boolean) {
    const now = this.sprite
    if (now && t === this.t && now.held.night === night) return false
    this.t = t
    const live = !!now && now.held.night === night
    hold(m, night, live ? now.held : null, this.want)
    if (m.mark !== this.mark) {
      this.mark = m.mark
      this.patches = patchesFor(m.mark)
    }
    // each animal's ticks are offset by 0.37 of a tick per id
    const at = t * RATE + ((m.id * 0.37) % 1), tick = Math.floor(at), half = Math.floor(at * 2)
    if (half !== this.half) {
      this.half = half
      if (half % 2 === 0 || Math.abs(m.turn) > QUICK) this.due = true
    }
    const veil = depthLevel(m.depth)
    let fresh = false
    if (!live || !now) {
      this.sprite = render(this.want, m.mark, light, null, this.patches)
      this.due = false
      this.level = Math.round(veil)
      this.levelTick = tick
    }
    else if (this.due && !same(now.held, this.want)) {
      if (spare) {
        this.sprite = render(this.want, m.mark, light, now.look, this.patches)
        this.due = false
        fresh = true
      }
    }
    else this.due = false
    // the veil walks one level at a time, with a new drawing or every third tick, once 0.65 of a level off
    if (live && tick !== this.levelTick && (fresh || tick - this.levelTick >= 3) && Math.abs(veil - this.level) > 0.65) {
      this.level += veil > this.level ? 1 : -1
      this.levelTick = tick
    }
    return fresh
  }
}
