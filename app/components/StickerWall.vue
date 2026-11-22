<script setup lang="ts">
import { stickerProblem, stickerTemplate, stickerView } from '#shared/guestbook'
import type { OwnSticker, Sticker, StickerPage } from '#shared/types'
import type { Spring } from '~/utils/spring'

// the newest stickers, the most the API sends at once
const LIMIT = 24
// a sticker is this share of the wall's width, within these bounds in px
const SHARE = 0.116
const NARROWEST = 96
const WIDEST = 188
// the room one sticker needs on a wall that grows to fit, in stickers
const ROOM = 2.3
// a carried sticker leans 8 degrees at most, as on the board
const MAX_LEAN = 8
// a thrown sticker lands where this long a glide would take it, in ms, and no throw is faster than this, in px a second
const GLIDE_MS = 220
const FASTEST = 1200
const SEED = 20260330

interface Spot {
  sticker: Sticker
  x: number
  y: number
  rot: number
  ratio: number
}

interface Carried {
  el: HTMLElement
  rot: number
  x: Spring
  y: Spring
  // where it is going once let go
  to: { x: number, y: number }
  lean: number
  held: boolean
}

interface Zone {
  l: number
  t: number
  r: number
  b: number
}

// they arrive after the page, so the words never wait for them
const { data } = await useFetch<StickerPage>('/api/guestbook', {
  key: 'guestbook-board',
  query: { limit: LIMIT },
  default: () => ({ stickers: [], total: 0, next: null }),
  server: false,
  lazy: true,
})

// the visitor's own, while it waits for review, goes up first
const { data: own } = await useFetch<OwnSticker>('/api/guestbook/mine', {
  key: 'guestbook-mine',
  default: () => ({ left: false, sticker: null }),
  server: false,
  lazy: true,
})

// without: stickers another wall already shows. grow: as tall as it takes to hold every sticker it is given
const props = defineProps<{ without?: readonly number[], grow?: boolean }>()
const emit = defineEmits<{ placed: [ids: number[]] }>()
defineSlots<{ default?: (props: { total: number }) => unknown }>()

const wall = ref<HTMLElement>()
const field = ref<HTMLCanvasElement>()
const dots = useWallDots(wall, field)
const spots = shallowRef<Spot[]>([])
const size = ref(0)
const carried = new Map<number, Carried>()
let zones: Zone[] = []
let bounds = { w: 0, h: 0 }
let tallest = 0
let raf = 0
let last = 0
let above = 1
let sizer: ResizeObserver | undefined

const drawable = (s: Sticker) => {
  const t = stickerTemplate(s.template)
  return !!t && !stickerProblem(t, s.strokes)
}
const newest = computed(() => {
  const mine = own.value?.sticker
  const all = [...(mine ? [mine] : []), ...(data.value?.stickers ?? []).filter(s => s.id !== mine?.id)]
  return all.filter(s => drawable(s) && !props.without?.includes(s.id))
})

function random(seed: number) {
  let a = seed
  return () => {
    a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const inZone = (x: number, y: number) => zones.some(z => x > z.l && x < z.r && y > z.t && y < z.b)
// a sticker may hang off the top and the sides, and stays whole above the wall's lower edge
const inBounds = (x: number, y: number) => x >= size.value * 0.3 && x <= bounds.w - size.value * 0.3 && y >= size.value * 0.3 && y <= bounds.h - tallest * 0.62
const free = (x: number, y: number) => inBounds(x, y) && !inZone(x, y)

function measure() {
  const el = wall.value!
  size.value = clamp(el.clientWidth * SHARE, NARROWEST, WIDEST)
  tallest = Math.max(0, ...newest.value.map((s) => {
    const view = stickerView(stickerTemplate(s.template)!)
    return size.value * view.h / view.w
  }))
  if (props.grow) {
    const words = [...el.querySelectorAll('[data-wall-clear]')].reduce((h, part) => h + part.getBoundingClientRect().height + tallest, 0)
    el.style.minHeight = newest.value.length ? `${Math.ceil(words + newest.value.length * size.value * tallest * ROOM / el.clientWidth)}px` : ''
  }
  const frame = el.getBoundingClientRect()
  bounds = { w: el.clientWidth, h: el.clientHeight }
  // a sticker's centre keeps this far from the words and the controls, so its edge never touches them
  const clear = [...el.querySelectorAll('[data-wall-clear]'), document.querySelector('.site-header.solid') ?? document.querySelector('[data-theme-toggle]')]
  zones = clear.flatMap((part) => {
    const b = part?.getBoundingClientRect()
    if (!b?.width) return []
    return [{ l: b.left - frame.left - size.value * 0.5 - 18, t: b.top - frame.top - tallest * 0.5 - 14, r: b.right - frame.left + size.value * 0.5 + 18, b: b.bottom - frame.top + tallest * 0.5 + 14 }]
  })
}

// each sticker takes the free spot furthest from the ones already up, so they spread evenly around the words
function layout() {
  if (!wall.value) return
  cancelAnimationFrame(raf)
  raf = 0
  carried.clear()
  measure()
  const next = random(SEED)
  const placed: Spot[] = []
  const edge = size.value * 0.34
  for (const sticker of newest.value) {
    let best: { x: number, y: number, near: number } | null = null
    for (let k = 0; k < 120; k++) {
      const x = edge + next() * (bounds.w - 2 * edge)
      const y = edge + next() * (bounds.h - edge - tallest * 0.62)
      if (!free(x, y)) continue
      // stickers are wider than tall, so distance counts for more down the page
      const near = placed.reduce((d, p) => Math.min(d, Math.hypot(p.x - x, (p.y - y) * 1.3)), Infinity)
      if (!best || near > best.near) best = { x, y, near }
    }
    const tilt = sticker.rot * 2.2 + (next() - 0.5) * 9
    // one that could only land on another is left off
    if (!best || best.near < size.value * 0.95) continue
    const view = stickerView(stickerTemplate(sticker.template)!)
    placed.push({ sticker, x: best.x, y: best.y, rot: tilt, ratio: view.w / view.h })
  }
  spots.value = placed
  emit('placed', placed.map(p => p.sticker.id))
  // the words may have moved, and the ripples keep clear of them
  dots.rebuild()
}

const placing = (x: number, y: number, rot: number, ratio: number) =>
  `translate3d(${x - size.value / 2}px, ${y - size.value / ratio / 2}px, 0) rotate(${rot}deg)`

// the nearest spot that covers no words: out by a side of whatever it sits on, or the closest clear point on a grid
function nearestFree(x: number, y: number) {
  const px = clamp(x, size.value * 0.3, bounds.w - size.value * 0.3)
  const py = clamp(y, size.value * 0.3, bounds.h - tallest * 0.62)
  if (free(px, py)) return { x: px, y: py }
  const tries: [number, number][] = []
  for (const z of zones) {
    if (px <= z.l || px >= z.r || py <= z.t || py >= z.b) continue
    tries.push([z.l - 1, py], [z.r + 1, py], [px, z.t - 1], [px, z.b + 1])
  }
  for (let gx = 0; gx <= bounds.w; gx += 24) {
    for (let gy = 0; gy <= bounds.h; gy += 24) tries.push([gx, gy])
  }
  let best = { x: px, y: py }
  let nearest = Infinity
  for (const [tx, ty] of tries) {
    const d = Math.hypot(tx - px, ty - py)
    if (d < nearest && free(tx, ty)) {
      nearest = d
      best = { x: tx, y: ty }
    }
  }
  return best
}

function grab(spot: Spot, e: PointerEvent) {
  // a finger on a sticker scrolls the page
  if (e.pointerType === 'touch' || e.button || !wall.value) return
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  const it = carried.get(spot.sticker.id) ?? { el, rot: spot.rot, x: { x: spot.x, v: 0 }, y: { x: spot.y, v: 0 }, to: { x: spot.x, y: spot.y }, lean: 0, held: false }
  carried.set(spot.sticker.id, it)
  el.setPointerCapture(e.pointerId)
  el.classList.add('held')
  el.style.zIndex = String(++above)
  it.held = true
  const frame = wall.value.getBoundingClientRect()
  const dx = e.clientX - frame.left - it.x.x
  const dy = e.clientY - frame.top - it.y.x
  let at = performance.now()

  const move = (m: PointerEvent) => {
    const now = performance.now()
    const dt = Math.max(8, now - at) / 1000
    const f = wall.value!.getBoundingClientRect()
    const x = m.clientX - f.left - dx
    const y = m.clientY - f.top - dy
    it.x.v = it.x.v * 0.6 + (x - it.x.x) / dt * 0.4
    it.y.v = it.y.v * 0.6 + (y - it.y.x) / dt * 0.4
    it.lean = nextLean(it.lean, (x - it.x.x) / bounds.w, dt)
    it.x.x = x
    it.y.x = y
    at = now
    run()
  }
  const drop = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', drop)
    el.removeEventListener('pointercancel', drop)
    el.classList.remove('held')
    it.held = false
    // a pointer that stopped before letting go throws nothing
    if (performance.now() - at > 90) it.x.v = it.y.v = 0
    const speed = Math.hypot(it.x.v, it.y.v)
    if (speed > FASTEST) {
      it.x.v *= FASTEST / speed
      it.y.v *= FASTEST / speed
    }
    it.to = nearestFree(it.x.x + it.x.v * GLIDE_MS / 1000, it.y.x + it.y.v * GLIDE_MS / 1000)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      it.x = { x: it.to.x, v: 0 }
      it.y = { x: it.to.y, v: 0 }
      it.lean = 0
    }
    run()
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', drop)
  el.addEventListener('pointercancel', drop)
  run()
}

function run() {
  if (raf) return
  last = performance.now()
  raf = requestAnimationFrame(step)
}

function step(now: number) {
  const dt = Math.min(0.032, (now - last) / 1000)
  last = now
  let moving = false
  for (const [id, it] of carried) {
    const spot = spots.value.find(p => p.sticker.id === id)
    if (!spot) continue
    if (it.held) moving = true
    else {
      const from = it.x.x
      stepSpring(it.x, it.to.x, dt, 0.42, 0.82)
      stepSpring(it.y, it.to.y, dt, 0.42, 0.82)
      it.lean = nextLean(it.lean, (it.x.x - from) / bounds.w, dt)
      if (!springAtRest(it.x, it.to.x, 0.2) || !springAtRest(it.y, it.to.y, 0.2) || Math.abs(it.lean) > 0.01) moving = true
    }
    it.el.style.transform = placing(it.x.x, it.y.x, it.rot + it.lean * MAX_LEAN, spot.ratio)
  }
  raf = moving ? requestAnimationFrame(step) : 0
}

watch(newest, () => nextTick(layout))

onMounted(() => {
  let width = 0
  // only a width change moves the words; the wall's height follows them
  sizer = new ResizeObserver(() => {
    if (wall.value!.clientWidth === width) return
    width = wall.value!.clientWidth
    layout()
  })
  sizer.observe(wall.value!)
  // the words move when the fonts arrive
  document.fonts.ready.then(layout)
})

onBeforeUnmount(() => {
  sizer?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div ref="wall" class="wall">
    <canvas ref="field" class="dots" aria-hidden="true" />
    <div class="stickers" aria-hidden="true">
      <div
        v-for="(p, i) in spots"
        :key="p.sticker.id"
        class="stuck"
        :style="{ '--i': i, 'width': `${size}px`, 'aspect-ratio': p.ratio, 'transform': placing(p.x, p.y, p.rot, p.ratio) }"
        @pointerdown="grab(p, $event)"
      >
        <div class="lay">
          <StickerArt :template="p.sticker.template" :strokes="p.sticker.strokes" />
        </div>
      </div>
    </div>
    <slot :total="data.total ?? 0" />
  </div>
</template>

<style scoped>
/* nothing clips at its lower edge, so the wall has no visible end; it sits above the page, so a sticker carried down stays on top of what is there */
.wall {
  position: relative;
  z-index: 1;
}
/* drawn by the script: the wall's dots, and the ripples that run through them */
.dots {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  mask-image: var(--wall-fade, linear-gradient(#000 55%, transparent));
  pointer-events: none;
}
.stickers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.stuck {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  cursor: grab;
  touch-action: pan-y;
  -webkit-user-select: none;
  user-select: none;
  will-change: transform;
}
.lay {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.22));
  transition: scale 180ms var(--ease-out), filter 180ms var(--ease-out);
  animation: stick 320ms var(--ease-out) both;
  animation-delay: calc(var(--i) * 55ms);
}
:root.dark .lay {
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.5));
}
.held {
  cursor: grabbing;
}
.held .lay {
  scale: 1.07;
  filter: drop-shadow(0 18px 22px rgb(0 0 0 / 0.3));
}
:root.dark .held .lay {
  filter: drop-shadow(0 18px 22px rgb(0 0 0 / 0.55));
}
@keyframes stick {
  from {
    opacity: 0;
    scale: 1.22;
  }
  60% {
    opacity: 1;
  }
}
@media (hover: hover) and (pointer: fine) {
  .stuck:not(.held):hover .lay {
    scale: 1.03;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lay {
    animation: none;
    transition: none;
  }
}
</style>
