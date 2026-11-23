<script lang="ts">
import type { Sticker, StickerStroke } from '#shared/types'

export interface BoardSticker extends Sticker {
  pending?: boolean
  placed?: boolean
}

export interface StickerDraft {
  template: string
  strokes: StickerStroke[]
}
</script>

<script setup lang="ts">
import { BOARD_ASPECT, STICKER_WIDTH, onBoard, stickerHalfHeight, stickerTemplate, stickerView } from '#shared/guestbook'
import type { Placement } from '#shared/types'

const props = defineProps<{ stickers: readonly BoardSticker[], draft?: StickerDraft | null, posting?: boolean, problem?: string, note?: string }>()
const emit = defineEmits<{ place: [placement: Placement, shareCountry: boolean], cancel: [] }>()

// stuck on at the lean it has when let go, 8 degrees at most
const MAX_TILT = 8
// a smaller lean reads as a mistake: stuck on straight
const LEAST_TILT = 1
// an arrow key moves the sticker 3% of the board's width; a sideways one also leans it
const NUDGE = 0.03
const KEY_TILT = 5

const wrap = ref<HTMLElement>()
const board = ref<HTMLElement>()
const tip = ref<BoardSticker | null>(null)
const ghost = ref({ x: 0.5, y: 0.5 })
const tilt = ref(0)
const dragging = ref(false)
const shareCountry = ref(false)
const mounted = ref(false)
let grab = { x: 0, y: 0 }
// share: the lean, -1 to 1
let pointerX = 0
let leanFrom = 0
let share = 0
let leanAt = 0
let leaning = 0
// where it was let go, so the one the server sends back can slide from there
let sentFrom: { x: number, y: number } | null = null

const ordered = computed(() => [...props.stickers].sort((a, b) => a.createdAt - b.createdAt))

function size(template: string) {
  const t = stickerTemplate(template)!
  const view = stickerView(t)
  return { ratio: `${view.w} / ${view.h}`, half: stickerHalfHeight(t) }
}

const clampToBoard = (template: string, x: number, y: number) => onBoard(stickerTemplate(template)!, x, y)

function spot(s: { template: string, x: number, y: number, rot: number }) {
  const { x, y } = clampToBoard(s.template, s.x, s.y)
  return { left: `${x * 100}%`, top: `${y * 100}%`, rotate: `${s.rot}deg`, aspectRatio: size(s.template).ratio }
}

const where = (e: PointerEvent) => {
  const r = board.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
}

watch(() => props.draft, (d, was) => {
  if (!d || was) return
  ghost.value = { x: 0.5, y: 0.5 }
  tilt.value = 0
  sentFrom = null
  tip.value = null
  nextTick(() => {
    board.value?.focus({ preventScroll: true })
    wrap.value?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  })
})

function onDown(e: PointerEvent) {
  if (!props.draft || props.posting || e.button !== 0) return
  e.preventDefault()
  const p = where(e), g = ghost.value
  const onGhost = Math.abs(p.x - g.x) < STICKER_WIDTH / 2 && Math.abs(p.y - g.y) < size(props.draft.template).half
  grab = onGhost ? { x: g.x - p.x, y: g.y - p.y } : { x: 0, y: 0 }
  ghost.value = clampToBoard(props.draft.template, p.x + grab.x, p.y + grab.y)
  dragging.value = true
  // a press away from the sticker jumps it there: not a sideways move
  pointerX = leanFrom = p.x
  share = tilt.value / MAX_TILT
  leanAt = performance.now()
  cancelAnimationFrame(leaning)
  leaning = requestAnimationFrame(lean)
  board.value!.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging.value || !props.draft) return
  const p = where(e)
  pointerX = p.x
  ghost.value = clampToBoard(props.draft.template, p.x + grab.x, p.y + grab.y)
}

function lean(now: number) {
  leaning = requestAnimationFrame(lean)
  const dt = Math.min(0.05, (now - leanAt) / 1000)
  if (dt <= 0) return
  share = nextLean(share, pointerX - leanFrom, dt)
  leanAt = now
  leanFrom = pointerX
  tilt.value = Math.round(share * MAX_TILT * 10) / 10
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  cancelAnimationFrame(leaning)
  if (Math.abs(tilt.value) < LEAST_TILT) tilt.value = 0
}

function onKey(e: KeyboardEvent) {
  if (!props.draft) return
  if (e.key === 'Escape') {
    emit('cancel')
    return
  }
  const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  const move = moves[e.key]
  if (!move || props.posting) return
  e.preventDefault()
  ghost.value = clampToBoard(props.draft.template, ghost.value.x + move[0] * NUDGE, ghost.value.y + move[1] * NUDGE * BOARD_ASPECT)
  // sideways keys lean it, up and down leave the lean alone
  if (move[0]) tilt.value = move[0] * KEY_TILT
}

function stick() {
  if (!props.draft || props.posting) return
  sentFrom = { ...ghost.value }
  emit('place', { ...ghost.value, rot: tilt.value }, shareCountry.value)
}

// the visitor's own sticker once the server has it
const landed = computed(() => props.stickers.find(s => s.placed))

// the server may put it beside where it was dropped (settleSticker): slide there, don't jump
watch(landed, async (s, was) => {
  const from = sentFrom
  if (!s || was || !from) return
  sentFrom = null
  await nextTick()
  const el = board.value?.querySelector<HTMLElement>(`[data-board-sticker="${s.id}"]`)
  const box = board.value?.getBoundingClientRect()
  if (!el || !box || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const to = clampToBoard(s.template, s.x, s.y)
  const dx = (from.x - to.x) * box.width
  const dy = (from.y - to.y) * box.height
  if (Math.hypot(dx, dy) < 1) return
  el.animate(
    [{ translate: `calc(-50% + ${dx}px) calc(-50% + ${dy}px)` }, { translate: '-50% -50%' }],
    { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  )
})

const tipStyle = computed(() => {
  const s = tip.value
  if (!s) return {}
  const { x, y } = clampToBoard(s.template, s.x, s.y)
  const { half } = size(s.template)
  const below = y - half < 0.2
  const side = x < 0.3 ? 'start' : x > 0.7 ? 'end' : 'middle'
  const left = side === 'start' ? x - STICKER_WIDTH / 2 : side === 'end' ? x + STICKER_WIDTH / 2 : x
  return {
    left: `${left * 100}%`,
    top: `${(below ? y + half : y - half) * 100}%`,
    translate: `${side === 'start' ? '0' : side === 'end' ? '-100%' : '-50%'} ${below ? '8px' : 'calc(-100% - 8px)'}`,
  }
})

const clock = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const regions = new Intl.DisplayNames(['en'], { type: 'region' })
const when = (t: number) => clock.format(t)
function country(code: string | null) {
  try {
    return (code && regions.of(code)) || 'Somewhere on Earth'
  }
  catch {
    return 'Somewhere on Earth'
  }
}

function label(s: BoardSticker) {
  const name = s.pending ? 'Your sticker, waiting for review' : `${stickerTemplate(s.template)!.label} sticker`
  return mounted.value ? `${name}, ${when(s.createdAt)}, ${country(s.country)}` : name
}

function showTip(e: PointerEvent, s: BoardSticker) {
  if (e.pointerType === 'mouse') tip.value = s
}

function hideTip(e: PointerEvent) {
  if (e.pointerType === 'mouse') tip.value = null
}

function closeTip(e: PointerEvent) {
  if (!(e.target as Element).closest?.('[data-board-sticker]')) tip.value = null
}

onMounted(() => {
  mounted.value = true
  document.addEventListener('pointerdown', closeTip)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(leaning)
  document.removeEventListener('pointerdown', closeTip)
})
</script>

<template>
  <div ref="wrap" class="sticker-board">
    <div
      ref="board"
      class="board"
      :class="{ placing: !!draft, dragging }"
      :tabindex="draft ? 0 : undefined"
      :role="draft ? 'group' : undefined"
      :aria-label="draft ? 'Sticker board. Arrow keys move your sticker.' : undefined"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @keydown="onKey"
    >
      <button
        v-for="s in ordered"
        :key="s.id"
        type="button"
        class="spot"
        :class="{ pending: s.pending, placed: s.placed, tipped: tip?.id === s.id }"
        :style="spot(s)"
        :aria-label="label(s)"
        :tabindex="draft ? -1 : undefined"
        :data-board-sticker="s.id"
        @pointerenter="showTip($event, s)"
        @pointerleave="hideTip"
        @focus="tip = s"
        @blur="tip = null"
        @click="tip = s"
      >
        <StickerArt :template="s.template" :strokes="s.strokes" />
      </button>
      <div v-if="draft && !landed" class="spot ghost" :style="spot({ ...draft, ...ghost, rot: tilt })" aria-hidden="true">
        <StickerArt :template="draft.template" :strokes="draft.strokes" />
      </div>
      <div v-if="tip && !draft" class="tip" :style="tipStyle" aria-hidden="true">
        <span>{{ when(tip.createdAt) }}</span>
        <span class="place">{{ country(tip.country) }}</span>
        <span v-if="tip.pending" class="place">Waiting for review</span>
      </div>
      <p v-if="!stickers.length && !draft && note" class="note">
        {{ note }}
      </p>
    </div>
    <StickerBoardPlacing v-if="draft" v-model:share="shareCountry" :posting="posting" :problem="problem" @cancel="emit('cancel')" @stick="stick" />
  </div>
</template>

<style scoped>
/* breaks out of the 592 px column to at most 880 px, keeping 16 px from the screen's edges */
.sticker-board {
  margin: 28px calc(50% - min(440px, 50vw - 16px)) 0;
  scroll-margin: 96px 0 16px;
}

.board {
  position: relative;
  aspect-ratio: 3 / 2;
  border-radius: 18px;
  background-color: var(--surface);
  box-shadow: var(--edge);
  background-image: radial-gradient(circle at 1px 1px, var(--line-strong) 1px, transparent 1.4px);
  background-size: 18px 18px;
  background-position: 9px 9px;
  outline-offset: 4px;
}

.placing {
  touch-action: none;
  cursor: grab;
}

.dragging {
  cursor: grabbing;
}

.spot {
  --land:
    opacity 150ms var(--ease-out),
    scale 200ms var(--ease-out),
    filter 200ms var(--ease-out),
    rotate 200ms var(--ease-out);
  position: absolute;
  display: block;
  width: 20%;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  translate: -50% -50%;
  cursor: default;
  transition: scale 150ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .board:not(.placing) .spot:hover {
    scale: 1.04;
  }
}

.spot:focus-visible,
.tipped {
  z-index: 1;
}

.placing .spot:not(.ghost) {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .spot {
    transition: opacity 150ms ease;
  }
}

.ghost {
  z-index: 2;
  scale: 1.06;
  filter: drop-shadow(0 10px 14px oklch(0% 0 0 / 0.2));
  transition: var(--land);
}

@starting-style {
  .ghost {
    opacity: 0;
    scale: 1;
  }
}

/* the lean is set every frame while carried; a transition on top would trail the hand */
.dragging .ghost {
  transition-property: opacity, scale, filter;
}

@media (prefers-reduced-motion: reduce) {
  .ghost {
    scale: 1;
    transition: opacity 150ms ease;
  }
}

.placed {
  transition: var(--land);
}

@starting-style {
  .placed {
    scale: 1.06;
    filter: drop-shadow(0 10px 14px oklch(0% 0 0 / 0.2));
  }
}

@media (prefers-reduced-motion: reduce) {
  .placed {
    scale: 1;
    transition: opacity 150ms ease;
  }
}

.tip {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  padding: 7px 11px 8px;
  border-radius: 10px;
  background: var(--ink);
  color: var(--paper);
  font-size: 13px;
  font-weight: 550;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
  animation: tip-in 120ms var(--ease-out);
}

@keyframes tip-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tip {
    animation: none;
  }
}

.place {
  font-weight: 450;
  opacity: 0.78;
}

.note {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--ink-2);
}
</style>
