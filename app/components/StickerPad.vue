<script setup lang="ts">
import { MAX_INK_PATHS, MAX_POINTS, MAX_STROKES, MAX_STROKE_POINTS, PRESSURE_PLAIN, groupWidths, inkPathCount, inkPaths, inkTransform, pressureStep, stickerGrid, stickerTemplate, stickerView, strokeRuns, takeWidths, withinWidths } from '#shared/guestbook'
import type { StickerStroke } from '#shared/types'

const props = defineProps<{ template: string, strokes: readonly StickerStroke[], color: number, size: number, locked?: boolean }>()
const emit = defineEmits<{ stroke: [stroke: StickerStroke], full: [] }>()

const SVG_NS = 'http://www.w3.org/2000/svg'
const PAD_MAX_HEIGHT = 'min(340px, 58svh)'
const MIN_STEP_PX = 1.5
const SIMPLIFY_PX = 0.6

interface Active {
  id: number
  kind: string
  points: number[]
  tip: [number, number, number] | null
  pressure: number
  rect: DOMRect
  strokes: number
  used: number
  paths: number
  widths: Set<number>
}

const t = computed(() => stickerTemplate(props.template)!)
const view = computed(() => stickerView(t.value))
const grid = computed(() => stickerGrid(t.value))
const paths = computed(() => inkPaths(t.value, props.strokes))
const used = computed(() => props.strokes.reduce((n, s) => n + s.points.length / 3, 0))
const inkUsed = computed(() => inkPathCount(props.strokes))
const full = computed(() => props.strokes.length >= MAX_STROKES || used.value >= MAX_POINTS || inkUsed.value >= MAX_INK_PATHS)

const layout = computed(() => {
  const v = view.value
  const r = t.value.region
  const pct = (n: number, of: number) => `${(n / of * 100).toFixed(3)}%`
  return {
    pad: { aspectRatio: `${v.w} / ${v.h}`, width: `min(100%, calc(${PAD_MAX_HEIGHT} * ${(v.w / v.h).toFixed(4)}))` },
    surface: { left: pct(r.x - v.x, v.w), top: pct(r.y - v.y, v.h), width: pct(r.w, v.w), height: pct(r.h, v.h), clipPath: `url(#stk-${t.value.id}-hit)` },
  }
})

const surface = ref<HTMLElement>()
const live = ref<SVGGElement>()
let active: Active | null = null

function sample(a: Active, e: PointerEvent) {
  const { cols, rows } = grid.value
  const r = a.rect
  const x = Math.min(cols, Math.max(0, Math.round((e.clientX - r.left) / r.width * cols)))
  const y = Math.min(rows, Math.max(0, Math.round((e.clientY - r.top) / r.height * rows)))
  if (a.kind === 'pen') a.pressure = a.pressure * 0.6 + (e.pressure || 0.5) * 0.4
  const p = a.kind === 'pen' ? pressureStep(a.pressure, a.tip?.[2] ?? a.points.at(-1)) : PRESSURE_PLAIN
  a.tip = [x, y, p]
  const pts = a.points
  const n = pts.length
  if (n) {
    const step = MIN_STEP_PX * cols / r.width
    const dx = x - pts[n - 3]!
    const dy = y - pts[n - 2]!
    if (dx * dx + dy * dy < step * step && p === pts[n - 1]) return
  }
  pts.push(x, y, p)
  a.tip = null
}

const withTip = (a: Active) => a.tip ? [...a.points, ...a.tip] : a.points

function simplify(pts: number[], tolerance: number) {
  const n = pts.length / 3
  if (n <= 2) return pts
  const keep = new Uint8Array(n)
  keep[0] = 1
  keep[n - 1] = 1
  for (let i = 1; i < n; i++) {
    if (pts[i * 3 + 2] !== pts[i * 3 - 1]) keep[i - 1] = keep[i] = 1
  }
  const spans: [number, number][] = []
  for (let i = 1, from = 0; i < n; i++) {
    if (!keep[i]) continue
    spans.push([from, i])
    from = i
  }
  while (spans.length) {
    const [a, b] = spans.pop()!
    const ax = pts[a * 3]!, ay = pts[a * 3 + 1]!
    const dx = pts[b * 3]! - ax, dy = pts[b * 3 + 1]! - ay
    const len = Math.hypot(dx, dy) || 1
    let far = -1
    let farthest = tolerance
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i * 3]! - ax) * dy - (pts[i * 3 + 1]! - ay) * dx) / len
      if (d > farthest) {
        farthest = d
        far = i
      }
    }
    if (far < 0) continue
    keep[far] = 1
    spans.push([a, far], [far, b])
  }
  const out: number[] = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!)
  return out
}

function drawLive() {
  const g = live.value
  const a = active
  if (!g || !a) return
  const ink = t.value.inks[props.color]!.hex
  let i = 0
  strokeRuns(withTip(a), t.value.sizes[props.size]! / grid.value.cell, (width, d) => {
    let path = g.children[i] as SVGPathElement | undefined
    if (!path) {
      path = document.createElementNS(SVG_NS, 'path')
      g.append(path)
    }
    path.setAttribute('d', d)
    path.setAttribute('stroke', ink)
    path.setAttribute('stroke-width', String(width))
    i++
  })
  while (g.children.length > i) g.lastElementChild!.remove()
}

function clearLive() {
  live.value?.replaceChildren()
}

function commit(a: Active) {
  const room = Math.min(MAX_STROKE_POINTS, MAX_POINTS - a.used)
  const points = room > 0 ? withinWidths(simplify(withTip(a), SIMPLIFY_PX * grid.value.cols / a.rect.width).slice(0, room * 3), props.size, a.widths, MAX_INK_PATHS - a.paths) : []
  if (points.length) emit('stroke', { color: props.color, size: props.size, points })
  return points
}

function finish() {
  const a = active
  if (!a) return
  active = null
  commit(a)
  clearLive()
}

function onShape(e: PointerEvent, rect: DOMRect) {
  const shape = document.getElementById(`stk-${t.value.id}-ink`)?.firstElementChild
  if (!(shape instanceof SVGGeometryElement)) return true
  const r = t.value.region
  try {
    return shape.isPointInFill({ x: r.x + (e.clientX - rect.left) / rect.width * r.w, y: r.y + (e.clientY - rect.top) / rect.height * r.h })
  }
  catch {
    return true
  }
}

function down(e: PointerEvent) {
  const el = surface.value!
  const rect = el.getBoundingClientRect()
  if (!onShape(e, rect)) return
  if (active) {
    if (e.pointerType !== 'pen' || active.kind !== 'touch') return
    active = null
    clearLive()
  }
  if ((e.pointerType === 'mouse' && e.button !== 0) || props.locked) return
  if (full.value) {
    emit('full')
    return
  }
  e.preventDefault()
  el.setPointerCapture(e.pointerId)
  el.focus({ preventScroll: true })
  active = { id: e.pointerId, kind: e.pointerType, points: [], tip: null, pressure: e.pressure || 0.5, rect, strokes: props.strokes.length, used: used.value, paths: inkUsed.value, widths: groupWidths(props.strokes, props.color) }
  sample(active, e)
  drawLive()
}

function move(e: PointerEvent) {
  const a = active
  if (!a || e.pointerId !== a.id) return
  a.rect = surface.value!.getBoundingClientRect()
  const batch = e.getCoalescedEvents?.() ?? []
  for (const ev of batch.length ? batch : [e]) {
    sample(a, ev)
    const count = a.points.length / 3
    const tipped = withTip(a)
    if (a.used + count >= MAX_POINTS || withinWidths(tipped, props.size, a.widths, MAX_INK_PATHS - a.paths).length < tipped.length) {
      finish()
      emit('full')
      return
    }
    if (count >= MAX_STROKE_POINTS) {
      const last = a.points.slice(-3)
      const kept = commit({ ...a, tip: null })
      a.used += kept.length / 3
      a.paths += takeWidths(a.widths, kept, props.size)
      if (++a.strokes >= MAX_STROKES) {
        active = null
        clearLive()
        emit('full')
        return
      }
      a.points = last
    }
  }
  drawLive()
}

function up(e: PointerEvent) {
  if (active && e.pointerId === active.id) finish()
}

onBeforeUnmount(() => {
  active = null
})
</script>

<template>
  <div class="pad" :style="layout.pad">
    <svg class="layer" :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`" aria-hidden="true" focusable="false">
      <use :href="`#stk-${t.id}-base`" />
    </svg>
    <svg class="layer" :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`" aria-hidden="true" focusable="false">
      <g :clip-path="`url(#stk-${t.id}-ink)`">
        <g :transform="inkTransform(t)" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path v-for="(p, i) in paths" :key="i" :d="p.d" :stroke="p.hex" :stroke-width="p.width" />
          <g ref="live" />
        </g>
      </g>
    </svg>
    <svg class="layer" :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`" aria-hidden="true" focusable="false">
      <use :href="`#stk-${t.id}-gloss`" />
      <use class="sticker-dim" :href="`#stk-${t.id}-o`" :stroke-width="t.border * 2" />
    </svg>
    <div
      ref="surface"
      class="surface"
      :class="{ full, locked }"
      :style="layout.surface"
      role="img"
      :aria-label="`Drawing area on the ${t.label}`"
      tabindex="-1"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @lostpointercapture="up"
    />
  </div>
</template>

<style scoped>
.pad {
  position: relative;
  margin: 0 auto;
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.surface {
  position: absolute;
  touch-action: none;
  cursor: crosshair;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.surface:focus {
  outline: none;
}
.surface.full {
  cursor: not-allowed;
}
.surface.locked {
  cursor: progress;
}
</style>
