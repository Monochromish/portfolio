import { bayer } from '../utils/dither'
import { CURL, EYE, FACE_X, FACE_Y, GLYPHS, MASKS, MOUTH, SHUT, WEIGHTS } from './face'
import type { Manta } from './manta'
import { hash2, labelClear } from './math'
import { BLEND_AT, FACES, MARK_AT, MARK_STEPS, PARTS, SINKS, SKIN_STEPS, SUB, tilesOf, VEIN_AT, type Palette, type Tiles } from './palette'

// A layer is two words. The first holds the face (depth level * FACES + face), the glyph and its ink: 0 to 2 the face's
// own ink pressed light, even or hard, then the catchlight and a shut lid's
const INK_GLINT = 3, INK_LID = 4
// The second holds the cells it covers, whether it is whole, a seam on its right and bottom, and its sink step
const WHOLE = 1 << 9, SEAM = 1 << 10, SINK = 11
// a shadow tile is deep or pale whole, or the tail's cells cut
export const DEEP = 1 << 9, PALE = 1 << 10
// layers a tile can hold: the tail's two tones or the vein's over a body piece over another animal
const MAXL = 4

// the anger mark at 9 and 15 cells, cut over the skin as it is drawn today; o marks the shine on edges that face the light
const VEIN_SMALL = [
  '..#...#..',
  '..#####..',
  '##.###.##',
  '.##...##.',
  '.##...##.',
  '.##...##.',
  '##.###.##',
  '..#####..',
  '..#...#..',
]
const VEIN_FULL = [
  '...#.......#...',
  '...##.....##...',
  '....#oo####....',
  '##..#######..##',
  '.###.#####.###.',
  '..o##.....o##..',
  '..o##.....o##..',
  '..###.....###..',
  '..###.....###..',
  '..###.....###..',
  '.###.oo###.###.',
  '##..#######..##',
  '....#######....',
  '...##.....##...',
  '...#.......#...',
]
const veinCells = (rows: string[]) => {
  const h = (rows.length - 1) / 2
  return rows.flatMap((row, y) => [...row].flatMap((ch, x) => ch === '.' ? [] : [x - h, y - h, ch === 'o' ? 1 : 0]))
}
const swell = (cells: number[]) => cells.map((v, i) => {
  const dx = cells[i - (i % 3)]!, dy = cells[i - (i % 3) + 1]!
  if (i % 3 === 0) return Math.abs(dy) >= Math.abs(dx) ? v : v + Math.sign(dx)
  if (i % 3 === 1) return Math.abs(dy) >= Math.abs(dx) ? v + Math.sign(dy) : v
  return v
})
const VEINS = [VEIN_SMALL, VEIN_FULL].map(veinCells)
VEINS.push(swell(VEINS[1]!))
// tiles the swollen mark can touch, with its shake: 17 cells a side span seven tiles
const VEIN_TILES = 49
// a held value gives way once the new one is 0.75 of a step from it
const HOLD = 0.75
// the eye's centre in body coordinates
const EYE_U = 0.068, EYE_W = 0.22
// a whole tile's shade off its plane: a step up or down, each with chance 0.12
const VARY = 0.12
// a letter a weight lighter or heavier than its step asks, each with chance 0.2
const JITTER = 0.2
// cells of nine a plane needs to set its tile's tone alone; below that a tile takes the mean of its cells
const PLANE = 7
// letters the atlas holds, 64 by 32, before it starts over
const ATLAS_X = 64, ATLAS_Y = 32

class Body {
  n = 0
  at = new Int32Array(256)
  w0 = new Uint32Array(256)
  w1 = new Uint32Array(256)
  shade = 0
  shadeAt = new Int32Array(256)
  shadeKind = new Uint16Array(256)
  sprite: unknown = null
  ox = 0
  oy = 0
  level = -1
  sinkSum = -1
  count = -1
  sx = 0
  sy = 0
  serial = 1
  seen = new Uint32Array(0)
  step = new Uint8Array(0)
  bu = new Int16Array(0)
  bw = new Int16Array(0)

  size(n: number) {
    this.seen = new Uint32Array(n)
    this.step = new Uint8Array(n)
    this.bu = new Int16Array(n)
    this.bw = new Int16Array(n)
    this.sprite = null
  }

  push(t: number, w0: number, w1: number) {
    if (this.n === this.at.length) {
      const at = new Int32Array(this.n * 2), a = new Uint32Array(this.n * 2), b = new Uint32Array(this.n * 2)
      at.set(this.at)
      a.set(this.w0)
      b.set(this.w1)
      this.at = at
      this.w0 = a
      this.w1 = b
    }
    this.at[this.n] = t
    this.w0[this.n] = w0
    this.w1[this.n++] = w1
  }

  cast(t: number, kind: number) {
    if (this.shade === this.shadeAt.length) {
      const at = new Int32Array(this.shade * 2), k = new Uint16Array(this.shade * 2)
      at.set(this.shadeAt)
      k.set(this.shadeKind)
      this.shadeAt = at
      this.shadeKind = k
    }
    this.shadeAt[this.shade] = t
    this.shadeKind[this.shade++] = kind
  }
}

export class Mosaic {
  cols = 0
  rows = 0
  private cellText: Float32Array = new Float32Array(0)
  private cellChrome: Float32Array = new Float32Array(0)
  private vat = new Int32Array(VEIN_TILES)
  private vred = new Uint16Array(VEIN_TILES)
  private vshine = new Uint16Array(VEIN_TILES)
  private shownN = new Uint8Array(0)
  private shownL = new Uint32Array(0)
  private nlay = new Uint8Array(0)
  // the topmost animal on each tile, 1 + its depth rank
  private own = new Uint8Array(0)
  private lay = new Uint32Array(0)
  private has = new Uint8Array(0)
  private stamp = new Uint32Array(0)
  private asked = new Uint32Array(0)
  private list = new Int32Array(0)
  private last = new Int32Array(0)
  private lastN = 0
  private serial = 0
  private W = 0
  private H = 0
  private K = 0
  private T = 0
  private dot = 0
  private seam = 0
  private ctx: CanvasRenderingContext2D
  private pal: Palette | null = null
  private tl: Tiles | null = null
  private bodies = new Map<number, Body>()
  private atlas: HTMLCanvasElement
  private actx: CanvasRenderingContext2D
  private slotOf = new Int16Array(0)
  private slots = 0
  private bmask = new Uint16Array(0)
  private gone = new Uint16Array(0)
  private tmask = new Uint16Array(0)
  private lmask = new Uint16Array(0)
  private sum = new Uint16Array(0)
  private cnt = new Uint8Array(0)
  private plane = new Uint8Array(0)
  private msum = new Uint16Array(0)
  private mcnt = new Uint8Array(0)
  private dark = new Uint8Array(0)
  private hi = new Uint8Array(0)
  private rim = new Uint8Array(0)
  private pmax = new Float32Array(0)
  private scast = new Uint8Array(0)
  private tcast = new Uint16Array(0)
  private pos = new Uint8Array(11)

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.atlas = document.createElement('canvas')
    this.actx = this.atlas.getContext('2d')!
  }

  resize(W: number, H: number, K: number, dpr: number) {
    if (W === this.W && H === this.H && K === this.K && this.canvas.width === W * K) return false
    this.W = W
    this.H = H
    this.K = K
    this.T = 3 * K
    // a letter's dot is a whole number of device px, the letter about 0.58 of the tile tall
    const dot = Math.max(1, Math.round(0.58 * this.T / FACE_Y))
    if (dot !== this.dot) {
      this.dot = dot
      this.atlas.width = ATLAS_X * FACE_X * dot
      this.atlas.height = ATLAS_Y * FACE_Y * dot
      this.clearAtlas()
    }
    this.seam = dot
    this.canvas.width = W * K
    this.canvas.height = H * K
    this.canvas.style.width = `${W * K / dpr}px`
    this.canvas.style.height = `${H * K / dpr}px`
    this.cols = Math.ceil(W / 3)
    this.rows = Math.ceil(H / 3)
    const n = this.cols * this.rows
    this.own = new Uint8Array(n)
    this.shownN = new Uint8Array(n)
    this.shownL = new Uint32Array(n * MAXL * 2)
    this.nlay = new Uint8Array(n)
    this.lay = new Uint32Array(n * MAXL * 2)
    this.has = new Uint8Array(n)
    this.stamp = new Uint32Array(n)
    this.asked = new Uint32Array(n)
    this.list = new Int32Array(n)
    this.last = new Int32Array(n)
    this.lastN = 0
    for (const b of this.bodies.values()) b.size(n)
    return true
  }

  measure(text: Float32Array, chrome: Float32Array) {
    this.cellText = text
    this.cellChrome = chrome
    for (const b of this.bodies.values()) b.sprite = null
  }

  destroy() {
    this.atlas.width = this.atlas.height = 0
  }

  shadowOf(m: Manta) {
    return this.bodyOf(m)
  }

  private bodyOf(m: Manta) {
    let b = this.bodies.get(m.id)
    if (!b) {
      b = new Body()
      b.size(this.cols * this.rows)
      this.bodies.set(m.id, b)
    }
    return b
  }

  private clearAtlas() {
    this.slotOf.fill(-1)
    this.slots = 0
    this.actx.clearRect(0, 0, this.atlas.width, this.atlas.height)
  }

  private theme(pal: Palette) {
    if (pal === this.pal) return
    this.pal = pal
    const tl = tilesOf(pal)
    this.tl = tl
    if (this.slotOf.length !== GLYPHS * tl.packed.length) this.slotOf = new Int16Array(GLYPHS * tl.packed.length)
    this.clearAtlas()
    // where each of body.ts's slots sits: K, D, BASE, LIT, HI on the skin's steps 0 to 16, the marks on theirs, the
    // glint on the highlight and the rim on the skin step nearest its own lightness
    this.pos.set([0, 0, SUB, 2 * SUB, 3 * SUB, 4 * SUB, 0, SUB, 2 * SUB, 4 * SUB, tl.rim])
    this.shownN.fill(0)
    this.lastN = 0
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (const b of this.bodies.values()) b.sprite = null
  }

  reduce(m: Manta, pal: Palette, night: boolean) {
    this.theme(pal)
    const b = this.bodyOf(m)
    const sp = m.sprite!, o = m.shadowOffset(night)
    if (b.sprite === sp && b.ox === m.ox && b.oy === m.oy && b.level === m.level && b.sinkSum === m.sinkSum && b.count === m.count
      && b.sx === o.x && b.sy === o.y) return
    b.sprite = sp
    b.ox = m.ox
    b.oy = m.oy
    b.level = m.level
    b.sinkSum = m.sinkSum
    b.count = m.count
    b.sx = o.x
    b.sy = o.y
    b.serial++
    b.n = 0
    b.shade = 0
    const { W, H, cols, pos } = this
    const { cells, slots, sinks, count, bodyCount } = m
    const ox = m.ox, oy = m.oy
    let x0 = W, y0 = H, x1 = -1, y1 = -1
    for (let k = 0; k < count; k++) {
      const idx = cells[k]!, x = idx % W, y = (idx - x) / W
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    if (count) {
      x1 = Math.min(W - 1, x1 + o.x)
      y1 = Math.min(H - 1, y1 + o.y)
    }
    for (let k = 0; k < m.edgeCount; k++) {
      const idx = m.edge[k]!, x = idx % W, y = (idx - x) / W
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    if (x1 < 0) return
    const ti0 = Math.floor(x0 / 3), tj0 = Math.floor(y0 / 3)
    const tw = Math.floor(x1 / 3) - ti0 + 1, th = Math.floor(y1 / 3) - tj0 + 1
    this.scratch(tw * th)
    const { bmask, gone, tmask, lmask, sum, cnt, plane, msum, mcnt, dark, hi, rim, pmax, scast, tcast } = this
    for (let k = 0; k < count; k++) {
      const idx = cells[k]!, x = idx % W, y = (idx - x) / W
      const ti = (x / 3) | 0, tj = (y / 3) | 0, q = (tj - tj0) * tw + ti - ti0
      const bit = 1 << ((y - tj * 3) * 3 + x - ti * 3)
      const sl = slots[k]!, p = sinks[k]!
      if (m.colors[k]) gone[q]! |= bit
      else if (p > pmax[q]!) pmax[q] = p
      const sx = x + o.x, sy = y + o.y
      if (sx < W && sy < H) {
        const si = (sx / 3) | 0, sj = (sy / 3) | 0, sq = (sj - tj0) * tw + si - ti0
        if (k < bodyCount) scast[sq]!++
        else tcast[sq]! |= 1 << ((sy - sj * 3) * 3 + sx - si * 3)
      }
      if (k >= bodyCount) {
        // slots 2 and 10 are the tail's own tone by day and by night, the rest the lit cells beside it
        if (sl === 2 || sl === 10) tmask[q]! |= bit
        else lmask[q]! |= bit
        continue
      }
      bmask[q]! |= bit
      if (sl >= 6 && sl <= 8) {
        msum[q]! += pos[sl]!
        mcnt[q]!++
        continue
      }
      sum[q]! += pos[sl]!
      cnt[q]!++
      if (sl <= 5 || sl === 9) plane[q * 5 + (sl === 9 ? 4 : sl - 1)]!++
      if (sl === 1) dark[q]!++
      else if (sl === 5 || sl === 9) hi[q]!++
      else if (sl === 10) rim[q]!++
    }
    for (let k = 0; k < m.edgeCount; k++) {
      const idx = m.edge[k]!, sx = idx % W, sy = (idx - sx) / W
      scast[(((sy / 3) | 0) - tj0) * tw + ((sx / 3) | 0) - ti0]!++
    }
    // a shadow tile is deep where the body covers five of its nine cells, pale where two to four
    for (let q = 0; q < tw * th; q++) {
      const t = (tj0 + ((q / tw) | 0)) * cols + ti0 + (q % tw)
      if (scast[q]! >= 5) b.cast(t, DEEP | 511)
      else if (scast[q]! >= 2) b.cast(t, PALE | 511)
      else if (tcast[q]) b.cast(t, tcast[q]!)
    }

    const held = sp.held, L = held.L, c = Math.cos(held.heading), s = Math.sin(held.heading)
    const lvl = m.level * FACES, sleep = held.sleep, night_ = held.night
    // each eye takes the first whole tile from its own toward the midline, a cell and a half a try; below 40 cells long
    // an eye is a single cell of the drawing and keeps no tile
    let eyeA = -1, eyeB = -1
    for (let side = -1; side <= 1 && L >= 40; side += 2) {
      let e = -1
      for (let k = 0; k <= 4 && e < 0; k++) {
        const a = (0.45 - EYE_U) * L, l = side * (EYE_W - k * 1.5 / L) * L
        const ti = Math.floor((ox + c * a - s * l) / 3) - ti0, tj = Math.floor((oy + s * a + c * l) / 3) - tj0
        if (ti < 0 || tj < 0 || ti >= tw || tj >= th) continue
        if ((bmask[tj * tw + ti]! & ~gone[tj * tw + ti]!) === 511) e = tj * tw + ti
      }
      if (side < 0) eyeA = e
      else eyeB = e
    }
    // the mouth runs across the head, by the eighth of a turn nearest to it
    const across = ((Math.round((held.heading + Math.PI / 2) / (Math.PI / 4)) % 4) + 4) % 4
    const oi = Math.floor(ox / 3), oj = Math.floor(oy / 3), id = m.id * 131
    const tail = night_ ? this.tl!.rim : SUB
    for (let q = 0; q < tw * th; q++) {
      const bm = bmask[q]! & ~gone[q]!, tm = tmask[q]! & ~gone[q]!, lm = lmask[q]! & ~gone[q]!
      if (!bm && !tm && !lm) continue
      const i = ti0 + (q % tw), j = tj0 + ((q / tw) | 0), t = j * cols + i
      const pm = pmax[q]!, pf = Math.floor(pm)
      const sunk = Math.min(SINKS - 1, pf + (pm - pf > bayer(i - oi, j - oj) ? 1 : 0)) << SINK
      if (bm) {
        const whole = bm === 511
        const dx = 3 * i + 1.5 - ox, dy = 3 * j + 1.5 - oy
        const along = dx * c + dy * s, side = -dx * s + dy * c
        const u = 0.45 - along / L, w = side / L, aw = Math.abs(w)
        // the body cell one tile across under the tile's centre, held until the skin has moved 0.75 of a tile past it
        const fu = (0.45 * L - along) / 3, fw = side / 3
        const known = b.seen[t] === b.serial - 1
        const bu = known && Math.abs(fu - b.bu[t]!) < HOLD ? b.bu[t]! : Math.round(fu)
        const bw = known && Math.abs(fw - b.bw[t]!) < HOLD ? b.bw[t]! : Math.round(fw)
        const h = hash2(bu, bw, id + 7), h2 = hash2(bw + 97, bu, id + 8), h3 = hash2(bu + 31, bw - 17, id + 9), h4 = hash2(bu - 53, bw + 29, id + 10)
        const vary = whole ? (h3 < VARY ? 1 : h3 > 1 - VARY ? -1 : 0) : 0
        const jit = h < JITTER ? -1 : h > 1 - JITTER ? 1 : 0
        const press = h4 < 1 / 3 ? 0 : h4 < 2 / 3 ? 1 : 2
        b.seen[t] = b.serial
        b.bu[t] = bu
        b.bw[t] = bw
        const n = cnt[q]!, mc = mcnt[q]!, cells9 = n + mc
        // the mouth's dark line across the front of the head, behind the cephalic fins and inside their roots
        const mouth = u > -0.02 && u < 0.1 && aw < 0.16 && dark[q]! >= 2
        let face: number, glyph = 0, ink = press, w1 = bm | SEAM | sunk
        if (q === eyeA || q === eyeB) {
          face = 0
          glyph = sleep ? SHUT : EYE
          ink = sleep ? INK_LID : INK_GLINT
          b.step[t] = 255
        }
        else if (mc >= Math.min(5, cells9) || (mc && n < 2)) {
          const mk = hold(b, t, known, msum[q]! / mc + vary, 32, MARK_STEPS - 1)
          face = MARK_AT + mk
          // the palest core is bare, a polished tile; the rest set in the skin's letters, the weight reversed
          if (whole && mk < MARK_STEPS - 2) {
            const set = WEIGHTS[Math.max(0, Math.min(2, 2 - Math.floor(mk / (MARK_STEPS - 1) * 3) + jit))]!
            glyph = set[Math.floor(h2 * set.length)]!
          }
        }
        else if (mc && !mouth) {
          const p = sum[q]! / n
          const share = Math.round(mc / cells9 * 3)
          const sk = Math.max(0, Math.min(4, Math.round(p / SUB))), mk = Math.max(0, Math.min(2, Math.round(msum[q]! / mc / SUB)))
          face = share >= 3 ? MARK_AT + mk * SUB : share <= 0 ? sk * SUB : BLEND_AT + (sk * 3 + mk) * 2 + share - 1
          b.step[t] = 255
          if (whole) {
            const set = WEIGHTS[1]!
            glyph = set[Math.floor(h2 * set.length)]!
          }
        }
        else if (mouth) {
          face = 0
          b.step[t] = 255
          if (whole) glyph = MOUTH[across]!
        }
        else {
          let p = sum[q]! / n
          let top = 0
          for (let k = 1; k < 5; k++) if (plane[q * 5 + k]! > plane[q * 5 + top]!) top = k
          if (plane[q * 5 + top]! >= PLANE) p = top * SUB
          // a cut tile keeps its edge's light: the rim by night, the highlight by day
          if (!whole && night_ && rim[q]) p = Math.max(p, this.tl!.rim)
          else if (!whole && hi[q]) p = Math.max(p, hi[q]! > 1 ? 4 * SUB : 3 * SUB)
          face = hold(b, t, known, p + vary, 0, SKIN_STEPS - 1)
          if (whole) {
            if (u < 0.01) {
              // ahead of u 0.01 a tile is a cephalic fin's, and its curl bulges away from the midline
              const nx = -s * Math.sign(w), ny = c * Math.sign(w)
              glyph = Math.abs(nx) > Math.abs(ny) ? CURL[nx < 0 ? 0 : 1]! : CURL[ny < 0 ? 2 : 3]!
            }
            else {
              const set = WEIGHTS[Math.max(0, Math.min(2, Math.min(2, Math.floor(face / (SKIN_STEPS - 1) * 3)) + jit))]!
              glyph = set[Math.floor(h2 * set.length)]!
            }
          }
        }
        if (whole) w1 |= WHOLE
        b.push(t, (lvl + face) | (glyph << 10) | (ink << 16), w1)
      }
      // the tail's lit cells are LIT by night and BASE by day, as body.ts draws them
      if (tm) b.push(t, lvl + tail, tm | sunk)
      if (lm) b.push(t, lvl + (night_ ? 3 * SUB : 2 * SUB), lm | sunk)
    }
  }

  private scratch(n: number) {
    if (this.bmask.length < n) {
      const size = Math.max(n, this.bmask.length * 2)
      this.bmask = new Uint16Array(size)
      this.gone = new Uint16Array(size)
      this.tmask = new Uint16Array(size)
      this.lmask = new Uint16Array(size)
      this.sum = new Uint16Array(size)
      this.cnt = new Uint8Array(size)
      this.plane = new Uint8Array(size * 5)
      this.msum = new Uint16Array(size)
      this.mcnt = new Uint8Array(size)
      this.dark = new Uint8Array(size)
      this.hi = new Uint8Array(size)
      this.rim = new Uint8Array(size)
      this.pmax = new Float32Array(size)
      this.scast = new Uint8Array(size)
      this.tcast = new Uint16Array(size)
    }
    this.bmask.fill(0, 0, n)
    this.gone.fill(0, 0, n)
    this.tmask.fill(0, 0, n)
    this.lmask.fill(0, 0, n)
    this.sum.fill(0, 0, n)
    this.cnt.fill(0, 0, n)
    this.plane.fill(0, 0, n * 5)
    this.msum.fill(0, 0, n)
    this.mcnt.fill(0, 0, n)
    this.dark.fill(0, 0, n)
    this.hi.fill(0, 0, n)
    this.rim.fill(0, 0, n)
    this.pmax.fill(0, 0, n)
    this.scast.fill(0, 0, n)
    this.tcast.fill(0, 0, n)
  }

  compose(order: Manta[], t: number, still: boolean) {
    const { cols, rows, nlay, lay, has, stamp, list } = this
    const serial = ++this.serial
    let n = 0
    for (let r = 0; r < order.length; r++) {
      const b = this.bodyOf(order[r]!)
      for (let k = 0; k < b.n; k++) {
        const at = b.at[k]!
        if (stamp[at] !== serial) {
          stamp[at] = serial
          nlay[at] = 0
          has[at] = 0
          list[n++] = at
        }
        const w1 = b.w1[k]!
        if (w1 & WHOLE) nlay[at] = 0
        if (nlay[at]! < MAXL) {
          const o = (at * MAXL + nlay[at]!) * 2
          lay[o] = b.w0[k]!
          lay[o + 1] = w1
          nlay[at]!++
        }
        has[at]! |= 1 << r
        this.own[at] = r + 1
      }
    }
    for (let r = 1; r < order.length; r++) {
      const b = this.bodyOf(order[r]!), bit = 1 << r
      for (let k = 0; k < b.shade; k++) {
        if (!(b.shadeKind[k]! & DEEP)) continue
        const at = b.shadeAt[k]!
        if (stamp[at] !== serial || this.own[at]! > r || has[at]! & bit) continue
        const i = at % cols, j = (at - i) / cols
        if ((i > 0 && stamp[at - 1] === serial && has[at - 1]! & bit) || (i < cols - 1 && stamp[at + 1] === serial && has[at + 1]! & bit)
          || (j > 0 && stamp[at - cols] === serial && has[at - cols]! & bit) || (j < rows - 1 && stamp[at + cols] === serial && has[at + cols]! & bit)) continue
        const o = (at * MAXL + nlay[at]! - 1) * 2
        lay[o] = darker(lay[o]!)
      }
    }
    for (let r = 0; r < order.length; r++) {
      const m = order[r]!, size = m.vein(t)
      if (size) n = this.vein(m, r, size, t, n)
    }
    const { shownN, shownL, asked } = this
    for (let k = 0; k < n; k++) {
      const at = list[k]!, c = nlay[at]!, o = at * MAXL * 2
      let same = shownN[at] === c, cut = same
      for (let q = 0; same && q < c * 2; q++) same = shownL[o + q] === lay[o + q]
      if (same) continue
      // a tile keeps its colour and letter until it has asked for new ones two frames running
      for (let q = 1; cut && q < c * 2; q += 2) cut = shownL[o + q] === lay[o + q]
      if (cut && !still && asked[at] !== serial - 1 && !eyed(lay[o + 2 * c - 2]!) && !eyed(shownL[o + 2 * c - 2]!)) {
        asked[at] = serial
        continue
      }
      shownN[at] = c
      for (let q = 0; q < c * 2; q++) shownL[o + q] = lay[o + q]!
      this.draw(at)
    }
    for (let k = 0; k < this.lastN; k++) {
      const at = this.last[k]!
      if (stamp[at] === serial || !shownN[at]) continue
      shownN[at] = 0
      this.own[at] = 0
      const i = at % cols, j = (at - i) / cols
      this.ctx.clearRect(i * this.T, j * this.T, this.T, this.T)
    }
    this.list = this.last
    this.last = list
    this.lastN = n
  }

  // on the forehead 0.28 body lengths ahead of the centre; it shakes a cell either way on the slap, otherwise bobs a cell
  // about 1.4 times a second
  private vein(m: Manta, r: number, size: number, t: number, n: number) {
    const { W, H, cols, stamp, nlay, lay, list, vat, vred, vshine } = this
    const cells = VEINS[size - 1]!, ahead = 0.28 * m.L, serial = this.serial
    const shake = m.madPhase === 'slap' ? (Math.floor(t * 24) % 2) * 2 - 1 : 0
    const bob = m.madPhase === 'slap' ? 0 : Math.round(Math.sin(t * 8.8))
    const fx = Math.round(m.x + Math.cos(m.heading) * ahead) + shake, fy = Math.round(m.y + Math.sin(m.heading) * ahead) + bob
    const ox = Math.round(m.x), oy = Math.round(m.y)
    let k = 0
    for (let c = 0; c < cells.length; c += 3) {
      const x = fx + cells[c]!, y = fy + cells[c + 1]!
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const at = ((y / 3) | 0) * cols + ((x / 3) | 0), cell = y * W + x
      if ((stamp[at] === serial && this.own[at]! > r + 1) || this.cellText[cell]! > 0.5
        || Math.max(m.sink / SINKS, labelClear(this.cellChrome[cell]!)) > bayer(x - ox, y - oy)) continue
      let q = 0
      while (q < k && vat[q] !== at) q++
      if (q === k) {
        if (k === VEIN_TILES) continue
        vat[k] = at
        vred[k] = vshine[k] = 0
        k++
      }
      const bit = 1 << ((y % 3) * 3 + (x % 3))
      if (cells[c + 2]) vshine[q]! |= bit
      else vred[q]! |= bit
    }
    const face = m.level * FACES + VEIN_AT
    for (let q = 0; q < k; q++) {
      const at = vat[q]!
      if (stamp[at] !== serial) {
        stamp[at] = serial
        nlay[at] = 0
        this.has[at] = 0
        this.own[at] = 0
        list[n++] = at
      }
      for (let c = 0; c < 2; c++) {
        const mask = c ? vshine[q]! : vred[q]!
        if (!mask || nlay[at]! >= MAXL) continue
        const o = (at * MAXL + nlay[at]!) * 2
        lay[o] = face + c
        lay[o + 1] = mask
        nlay[at]!++
      }
    }
    return n
  }

  private draw(at: number) {
    const { ctx, T, cols } = this
    const i = at % cols, j = (at - i) / cols, px = i * T, py = j * T
    const c = this.nlay[at]!, o = at * MAXL * 2
    if (!c || !(this.lay[o + 1]! & WHOLE)) ctx.clearRect(px, py, T, T)
    for (let k = 0; k < c; k++) this.layer(px, py, this.lay[o + 2 * k]!, this.lay[o + 2 * k + 1]!)
  }

  private layer(px: number, py: number, w0: number, w1: number) {
    const { ctx, T, seam } = this
    const tl = this.tl!, face = w0 & 1023, glyph = (w0 >>> 10) & 63, ink = (w0 >>> 16) & 15
    const mask = w1 & 511, sink = (w1 >>> SINK) & 15, c = face * PARTS
    if (w1 & WHOLE) {
      if (w1 & SEAM) {
        ctx.fillStyle = tl.css[c + 1]!
        ctx.fillRect(px, py, T, T)
        ctx.fillStyle = tl.css[c]!
        ctx.fillRect(px, py, T - seam, T - seam)
      }
      else {
        ctx.fillStyle = tl.css[c]!
        ctx.fillRect(px, py, T, T)
      }
    }
    else {
      ctx.fillStyle = tl.css[c]!
      this.cut(px, py, mask)
      if (w1 & SEAM) this.seams(px, py, mask, tl.css[c + 1]!)
    }
    if (glyph) {
      const level = (face / FACES) | 0
      const id = ink < 3 ? face * PARTS + 2 + ink : ink === INK_GLINT ? tl.glint + level : (level * FACES + 2 * SUB) * PARTS + 3
      this.letter(px, py, glyph, id)
    }
    if (sink) {
      ctx.globalAlpha = sink / SINKS
      ctx.fillStyle = tl.sink
      if (w1 & WHOLE) ctx.fillRect(px, py, T, T)
      else this.cut(px, py, mask)
      ctx.globalAlpha = 1
    }
  }

  private cut(px: number, py: number, mask: number) {
    const { ctx, K } = this
    for (let r = 0; r < 3; r++) {
      const bits = (mask >> (r * 3)) & 7
      if (!bits) continue
      let h = 1
      while (r + h < 3 && ((mask >> ((r + h) * 3)) & 7) === bits) h++
      for (let c = 0; c < 3; c++) {
        if (!(bits & (1 << c))) continue
        let w = 1
        while (c + w < 3 && bits & (1 << (c + w))) w++
        ctx.fillRect(px + c * K, py + r * K, w * K, h * K)
        c += w - 1
      }
      r += h - 1
    }
  }

  // bits 2, 5 and 8 are a tile's right column and 6 to 8 its bottom row, where a cut piece keeps its seam
  private seams(px: number, py: number, mask: number, style: string) {
    const { ctx, K, T, seam } = this
    ctx.fillStyle = style
    for (let r = 0; r < 3; r++) {
      if (!(mask & (4 << (r * 3)))) continue
      let h = 1
      while (r + h < 3 && mask & (4 << ((r + h) * 3))) h++
      ctx.fillRect(px + T - seam, py + r * K, seam, h * K)
      r += h - 1
    }
    for (let c = 0; c < 3; c++) {
      if (!(mask & (64 << c))) continue
      let w = 1
      while (c + w < 3 && mask & (64 << (c + w))) w++
      ctx.fillRect(px + c * K, py + T - seam, w * K, seam)
      c += w - 1
    }
  }

  private letter(px: number, py: number, glyph: number, id: number) {
    const { dot, T, seam, tl } = this
    const gw = FACE_X * dot, gh = FACE_Y * dot
    let slot = this.slotOf[glyph * tl!.packed.length + id]!
    if (slot < 0) {
      if (this.slots === ATLAS_X * ATLAS_Y) this.clearAtlas()
      slot = this.slots++
      this.slotOf[glyph * tl!.packed.length + id] = slot
      const sx = (slot % ATLAS_X) * gw, sy = ((slot / ATLAS_X) | 0) * gh, a = this.actx
      a.fillStyle = tl!.css[id]!
      const m = glyph * FACE_X * FACE_Y
      for (let y = 0; y < FACE_Y; y++) {
        for (let x = 0; x < FACE_X; x++) {
          if (!MASKS[m + y * FACE_X + x]) continue
          let w = 1
          while (x + w < FACE_X && MASKS[m + y * FACE_X + x + w]) w++
          a.fillRect(sx + x * dot, sy + y * dot, w * dot, dot)
          x += w - 1
        }
      }
    }
    this.ctx.drawImage(this.atlas, (slot % ATLAS_X) * gw, ((slot / ATLAS_X) | 0) * gh, gw, gh,
      px + ((T - seam - gw) >> 1), py + ((T - seam - gh) >> 1), gw, gh)
  }
}

const eyed = (w0: number) => {
  const g = (w0 >>> 10) & 63
  return g === EYE || g === SHUT
}

// a step held while the new value is within 0.75 of it; a mark's step is told from the skin's by 32
function hold(b: Body, t: number, known: boolean, p: number, kind: number, top: number) {
  const was = b.step[t]!
  const v = Math.max(0, Math.min(top, known && (was & 32) === kind && Math.abs(p - (was & 31)) < HOLD ? was & 31 : Math.round(p)))
  b.step[t] = v | kind
  return v
}

// one palette tone down: four skin steps, four mark steps, or a step of each for a tile they share
function darker(w0: number) {
  const id = w0 & 1023, level = (id / FACES) | 0, f = id - level * FACES
  let g: number
  if (f < MARK_AT) g = Math.max(0, f - SUB)
  else if (f < BLEND_AT) g = Math.max(MARK_AT, f - SUB)
  else {
    const k = f - BLEND_AT, share = k & 1, sk = (k >> 1) / 3 | 0, mk = (k >> 1) % 3
    g = BLEND_AT + (Math.max(0, sk - 1) * 3 + Math.max(0, mk - 1)) * 2 + share
  }
  return (w0 & ~1023) | (level * FACES + g)
}
