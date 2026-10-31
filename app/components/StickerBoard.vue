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
import { stickerTemplate, stickerView } from '#shared/guestbook'
import type { Placement } from '#shared/types'

const props = defineProps<{ stickers: readonly BoardSticker[], draft?: StickerDraft | null, posting?: boolean, problem?: string, note?: string }>()
const emit = defineEmits<{ place: [placement: Placement, shareCountry: boolean], cancel: [] }>()

// a sticker is a fifth of the board's width on every screen, so everyone sees the same board; the board is 3:2
const WIDTH = 0.2
const ASPECT = 3 / 2
// stuck on at up to 8 degrees either way, like a hand would
const MAX_TILT = 8
// an arrow key moves the sticker 3% of the board's width
const NUDGE = 0.03

const wrap = ref<HTMLElement>()
const board = ref<HTMLElement>()
const tip = ref<BoardSticker | null>(null)
const ghost = ref({ x: 0.5, y: 0.5 })
const tilt = ref(0)
const dragging = ref(false)
const shareCountry = ref(false)
const mounted = ref(false)
let grab = { x: 0, y: 0 }

const ordered = computed(() => [...props.stickers].sort((a, b) => a.createdAt - b.createdAt))

function size(template: string) {
  const view = stickerView(stickerTemplate(template)!)
  return { ratio: `${view.w} / ${view.h}`, half: WIDTH * view.h / view.w * ASPECT / 2 }
}

function clampToBoard(template: string, x: number, y: number) {
  const { half } = size(template)
  return { x: Math.min(1 - WIDTH / 2, Math.max(WIDTH / 2, x)), y: Math.min(1 - half, Math.max(half, y)) }
}

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
  tilt.value = Math.round((Math.random() * 2 - 1) * MAX_TILT * 10) / 10
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
  const onGhost = Math.abs(p.x - g.x) < WIDTH / 2 && Math.abs(p.y - g.y) < size(props.draft.template).half
  grab = onGhost ? { x: g.x - p.x, y: g.y - p.y } : { x: 0, y: 0 }
  ghost.value = clampToBoard(props.draft.template, p.x + grab.x, p.y + grab.y)
  dragging.value = true
  board.value!.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging.value || !props.draft) return
  const p = where(e)
  ghost.value = clampToBoard(props.draft.template, p.x + grab.x, p.y + grab.y)
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
  ghost.value = clampToBoard(props.draft.template, ghost.value.x + move[0] * NUDGE, ghost.value.y + move[1] * NUDGE * ASPECT)
}

function stick() {
  if (props.draft && !props.posting) emit('place', { ...ghost.value, rot: tilt.value }, shareCountry.value)
}

const tipStyle = computed(() => {
  const s = tip.value
  if (!s) return {}
  const { x, y } = clampToBoard(s.template, s.x, s.y)
  const { half } = size(s.template)
  const below = y - half < 0.2
  const side = x < 0.3 ? 'start' : x > 0.7 ? 'end' : 'middle'
  const left = side === 'start' ? x - WIDTH / 2 : side === 'end' ? x + WIDTH / 2 : x
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

onBeforeUnmount(() => document.removeEventListener('pointerdown', closeTip))
</script>

<template>
  <div ref="wrap" class="board-wrap">
    <div
      ref="board"
      class="board"
      :class="{ placing: !!draft, dragging }"
      :tabindex="draft ? 0 : undefined"
      :role="draft ? 'group' : undefined"
      :aria-label="draft ? 'Sticker board. Arrow keys move your sticker.' : undefined"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="dragging = false"
      @pointercancel="dragging = false"
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
        data-board-sticker
        @pointerenter="showTip($event, s)"
        @pointerleave="hideTip"
        @focus="tip = s"
        @blur="tip = null"
        @click="tip = s"
      >
        <StickerArt :template="s.template" :strokes="s.strokes" />
      </button>
      <div v-if="draft" class="spot ghost" :style="spot({ ...draft, ...ghost, rot: tilt })" aria-hidden="true">
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
    <div v-if="draft" class="placing-bar">
      <p class="hint">
        Drag your sticker anywhere on the board.
      </p>
      <div class="choices">
        <label class="share">
          <input v-model="shareCountry" type="checkbox">
          Share my country
        </label>
        <div class="buttons">
          <button type="button" class="cancel" @click="emit('cancel')">
            Cancel
          </button>
          <button type="button" class="stick" :aria-disabled="posting ? 'true' : undefined" @click="stick">
            {{ posting ? 'Sticking' : 'Stick it here' }}
            <span class="i-site-send" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p v-if="problem" class="problem" role="alert">
        {{ problem }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* breaks out of the 592 px column to at most 880 px, keeping 16 px from the screen's edges */
.board-wrap {
  margin: 28px calc(50% - min(440px, 50vw - 16px)) 0;
  scroll-margin: 96px 0 16px;
}
.board {
  position: relative;
  aspect-ratio: 3 / 2;
  border: 1px solid var(--line);
  border-radius: 18px;
  background-color: var(--surface);
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
.spot:focus-visible,
.tipped {
  z-index: 1;
}
.placing .spot:not(.ghost) {
  pointer-events: none;
}
.ghost {
  z-index: 2;
  scale: 1.06;
  filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.2));
}
@starting-style {
  .ghost {
    opacity: 0;
    scale: 1;
  }
}
.ghost,
.placed {
  transition: opacity 150ms var(--ease-out), scale 200ms var(--ease-out), filter 200ms var(--ease-out);
}
@starting-style {
  .placed {
    scale: 1.06;
    filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.2));
  }
}
@media (hover: hover) and (pointer: fine) {
  .board:not(.placing) .spot:hover {
    scale: 1.04;
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
.tip .place {
  font-weight: 450;
  opacity: 0.78;
}
@keyframes tip-in {
  from {
    opacity: 0;
  }
}
.note {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--ink-2);
}
.placing-bar {
  margin-top: 14px;
  padding-inline: 8px;
}
.hint {
  margin: 0;
  font-size: 14px;
  text-align: center;
  color: var(--ink-2);
}
.choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 20px;
  margin-top: 10px;
}
.share {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  font-size: 15px;
  font-weight: 550;
  color: var(--ink);
  cursor: pointer;
}
.share input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.buttons {
  display: flex;
  gap: 8px;
}
.cancel,
.stick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.cancel {
  padding: 0 16px;
  border: 1px solid var(--line-strong);
  color: var(--ink);
}
.stick {
  padding: 0 18px 0 20px;
  background: var(--accent);
  color: var(--on-accent);
}
.stick span {
  font-size: 18px;
}
.cancel:active,
.stick:active {
  transform: scale(0.97);
}
.stick[aria-disabled='true'] {
  cursor: progress;
  background: color-mix(in srgb, var(--accent) 80%, var(--paper));
}
@media (hover: hover) and (pointer: fine) {
  .cancel:hover {
    background: color-mix(in srgb, var(--ink) 5%, transparent);
  }
  .stick:not([aria-disabled='true']):hover {
    background: color-mix(in srgb, var(--accent) 86%, var(--ink));
  }
}
.problem {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 550;
  line-height: 1.45;
  text-align: center;
  color: var(--ink);
}
@media (prefers-reduced-motion: reduce) {
  .spot,
  .ghost,
  .placed {
    transition: opacity 150ms ease;
  }
  .ghost,
  .placed {
    scale: 1;
  }
  .tip {
    animation: none;
  }
}
</style>
