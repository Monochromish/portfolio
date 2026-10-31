<script setup lang="ts">
import { Lagoon } from '~/lagoon/world'

const props = defineProps<{ covered: boolean }>()

const layer = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const paused = ref(false)
const reduced = ref(false)
let lagoon: Lagoon | null = null
let themeWatch: MutationObserver | null = null
let calmWatch: MutationObserver | null = null
let host: HTMLElement | null = null
const top = useLagoonTop()

const IGNORE = 'a, button, input, textarea, select, label, summary, [role="button"], [data-lagoon-ignore], [data-lagoon-calm]'

function onMove(e: PointerEvent) {
  lagoon?.move(e.clientX, e.clientY, e.pointerType === 'mouse' || e.pointerType === 'pen')
}

let tap: { id: number, x: number, y: number, t: number } | null = null

function onDown(e: PointerEvent) {
  if (!lagoon || reduced.value || e.button !== 0) return
  if ((e.target as Element).closest(IGNORE)) return
  if (getSelection()?.toString()) return
  if (e.pointerType === 'mouse') lagoon.feed(e.clientX, e.clientY)
  else tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }
}

function onUp(e: PointerEvent) {
  if (!tap || e.pointerId !== tap.id) return
  const { x, y, t } = tap
  tap = null
  if (e.timeStamp - t < 500 && Math.hypot(e.clientX - x, e.clientY - y) < 10) lagoon?.feed(x, y)
}

function onCancel() {
  tap = null
}

let flicks: number[] = []
function onFlick(e: MouseEvent) {
  const toggle = (e.target as Element).closest('[data-theme-toggle]')
  if (!toggle || !lagoon || props.covered || paused.value || reduced.value) return
  // five flips of the light inside 2.5 s annoys the mantas
  flicks = [...flicks.filter(at => e.timeStamp - at < 2500), e.timeStamp]
  if (flicks.length < 5) return
  flicks = []
  const r = toggle.getBoundingClientRect()
  lagoon.provoke(r.left + r.width / 2, r.top + r.height / 2)
}

function onLeave() {
  lagoon?.leave()
}

function toggle() {
  paused.value = !paused.value
  lagoon?.setPaused(paused.value)
  try {
    sessionStorage.setItem('lagoon-paused', paused.value ? '1' : '0')
  }
  catch {
  }
}

watch(() => props.covered, c => lagoon?.setVisible(!c))

onMounted(() => {
  host = layer.value?.parentElement ?? null
  if (!canvas.value || !host) throw new Error('LagoonCanvas must sit inside its hero element')
  reduced.value = matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    paused.value = sessionStorage.getItem('lagoon-paused') === '1'
  }
  catch {
    paused.value = false
  }
  const root = document.documentElement
  lagoon = new Lagoon(canvas.value, host, {
    night: root.classList.contains('dark'),
    reduced: reduced.value,
    onTop: (color, night) => { top.value = { ...top.value, [night ? 'dark' : 'light']: color } },
    onSplash: () => document.querySelector('[data-theme-toggle]')?.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' }],
      { duration: 360, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    ),
  })
  themeWatch = new MutationObserver(() => lagoon?.setNight(root.classList.contains('dark')))
  themeWatch.observe(root, { attributes: true, attributeFilter: ['class'] })
  calmWatch = new MutationObserver(() => lagoon?.relayout())
  calmWatch.observe(document.body, { subtree: true, attributeFilter: ['data-lagoon-calm'] })
  if (!reduced.value) {
    lagoon.setPaused(paused.value)
    lagoon.setVisible(!props.covered)
    lagoon.start()
    window.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointerup', onUp)
    host.addEventListener('pointercancel', onCancel)
    document.documentElement.addEventListener('pointerleave', onLeave)
    document.addEventListener('click', onFlick)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  host?.removeEventListener('pointerdown', onDown)
  host?.removeEventListener('pointerup', onUp)
  host?.removeEventListener('pointercancel', onCancel)
  document.documentElement.removeEventListener('pointerleave', onLeave)
  document.removeEventListener('click', onFlick)
  themeWatch?.disconnect()
  calmWatch?.disconnect()
  lagoon?.destroy()
  lagoon = null
})

defineExpose({ relayout: () => lagoon?.relayout() })
</script>

<template>
  <div ref="layer" class="layer">
    <canvas ref="canvas" class="lagoon" aria-hidden="true" />
  <button
    v-if="!reduced"
    type="button"
    class="pause"
    data-lagoon-ignore
    :aria-label="paused ? 'Play the lagoon' : 'Pause the lagoon'"
    :title="paused ? 'Play' : 'Pause'"
    @click="toggle"
  >
    <span :class="paused ? 'i-site-play' : 'i-site-pause'" />
  </button>
  </div>
</template>

<style scoped>
.layer {
  position: absolute;
  inset: 0;
}
.lagoon {
  position: absolute;
  inset: 0 auto auto 0;
  image-rendering: pixelated;
  touch-action: pan-y pinch-zoom;
}
.pause {
  position: absolute;
  z-index: 1;
  right: max(16px, env(safe-area-inset-right));
  bottom: calc(80px + env(safe-area-inset-bottom));
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  color: var(--ink);
  background: color-mix(in srgb, var(--paper) 55%, transparent);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-size: 18px;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .pause:hover {
    background: color-mix(in srgb, var(--paper) 80%, transparent);
  }
}
.pause:active {
  transform: scale(0.95);
}
@media (pointer: coarse) {
  .pause {
    width: 44px;
    height: 44px;
  }
}
.pause:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--paper);
}
@media (max-height: 340px) {
  .pause {
    bottom: calc(36px + env(safe-area-inset-bottom));
  }
}
@media (prefers-reduced-transparency: reduce) {
  .pause {
    background: var(--paper);
    backdrop-filter: none;
  }
}
</style>
