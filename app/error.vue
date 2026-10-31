<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const status = computed(() => props.error.status || 500)
const missing = computed(() => status.value === 404)
const title = computed(() => missing.value ? 'Page not found' : 'Something went wrong')
const { name } = useIdentity()

useSeoMeta({
  title: () => `${title.value} · ${name}`,
  robots: 'noindex',
})
useToolbarTint()

const referer = useRequestHeaders(['referer']).referer
const origin = useRequestURL().origin
function sameOrigin(url: string | undefined) {
  try {
    return !!url && new URL(url).origin === origin
  }
  catch {
    return false
  }
}
const fromSite = useState('error-from-site', () => import.meta.client ? !!history.state?.back || sameOrigin(document.referrer) : sameOrigin(referer))

function previous(e: MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  let fromSite = false
  try {
    fromSite = new URL(document.referrer).origin === location.origin
  }
  catch {
    fromSite = false
  }
  if (history.state?.back || (fromSite && history.length > 1)) history.back()
  else clearError({ redirect: '/' })
}

const FONT = '600 1000px Figtree, "Figtree Fallback", system-ui, sans-serif'
const REVEAL = 800

const stage = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()

let ctx: CanvasRenderingContext2D | null = null
let frame: ImageData | null = null
let fb: Uint32Array | null = null
let inside: Uint8Array | null = null
let tone: Uint32Array | null = null
let order: Float32Array | null = null
let cols = 0
let rows = 0
let shown = 0
let raf = 0
let sizer: ResizeObserver | undefined
let themes: MutationObserver | undefined
let fontReady = false

function paintTones() {
  if (inside) tone = rampFill(inside, cols, rows, readColor(stage.value!, '--ink'), readColor(stage.value!, '--accent'))
}

function fit(width: number, height: number) {
  if (!fontReady || !canvas.value) return
  const dpr = devicePixelRatio || 1
  const cell = innerWidth < 640 ? 3 : 4
  const k = Math.max(2, Math.round(cell * dpr))
  const text = String(status.value)
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = FONT
  const m = probe.measureText(text)
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  const css = Math.min(width, height * inkW / inkH)
  const c = Math.max(1, Math.round(css * dpr / k))
  const el = canvas.value
  if (c !== cols) {
    cols = c
    const s = cols / inkW
    rows = Math.max(1, Math.round(inkH * s))
    const off = document.createElement('canvas')
    off.width = cols
    off.height = rows
    const octx = off.getContext('2d', { willReadFrequently: true })!
    octx.font = FONT.replace('1000px', `${1000 * s}px`)
    octx.fillText(text, m.actualBoundingBoxLeft * s, m.actualBoundingBoxAscent * s)
    const px = octx.getImageData(0, 0, cols, rows).data
    inside = new Uint8Array(cols * rows)
    order = new Float32Array(cols * rows)
    for (let i = 0; i < inside.length; i++) inside[i] = px[i * 4 + 3]! > 127 ? 1 : 0
    // one column over, so the reveal does not follow the tone ramp
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) order[y * cols + x] = bayer(x + 1, y)
    el.width = cols
    el.height = rows
    ctx = el.getContext('2d')!
    frame = ctx.createImageData(cols, rows)
    fb = new Uint32Array(frame.data.buffer)
    paintTones()
    draw()
  }
  el.style.width = `${cols * k / dpr}px`
  el.style.height = `${rows * k / dpr}px`
}

function draw() {
  if (!ctx || !frame || !fb || !tone || !order) return
  for (let i = 0; i < fb.length; i++) fb[i] = order[i]! < shown ? tone[i]! : 0
  ctx.putImageData(frame, 0, 0)
}

function reveal(reduced: boolean) {
  if (reduced) {
    shown = 1
    draw()
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / REVEAL)
    // quintic ease-out, close to --ease-out
    shown = 1 - (1 - t) ** 5
    draw()
    raf = t < 1 ? requestAnimationFrame(step) : 0
  }
  raf = requestAnimationFrame(step)
}

onMounted(async () => {
  try {
    await document.fonts.load(FONT, String(status.value))
  }
  catch {
  }
  if (!stage.value) return
  fontReady = true
  const box = stage.value.getBoundingClientRect()
  fit(box.width, box.height)
  reveal(matchMedia('(prefers-reduced-motion: reduce)').matches)
  sizer = new ResizeObserver(([entry]) => fit(entry!.contentRect.width, entry!.contentRect.height))
  try {
    sizer.observe(stage.value, { box: 'device-pixel-content-box' })
  }
  catch {
    sizer.observe(stage.value)
  }
  themes = new MutationObserver(() => {
    paintTones()
    draw()
  })
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  sizer?.disconnect()
  themes?.disconnect()
})

const fallback = computed(() => `<p class="plain">${status.value}</p>`)
</script>

<template>
  <a class="skip" href="#content">Skip to content</a>
  <NuxtRouteAnnouncer />
  <SiteHeader>
    <template v-if="fromSite" #lead>
      <a href="/" class="back" @click="previous">
        <span class="i-site-arrow-left arrow" aria-hidden="true" />
        Previous
      </a>
    </template>
  </SiteHeader>
  <main id="content" class="lost">
    <h1 class="sr-only">{{ title }}</h1>
    <p class="sr-only">
      Error {{ status }}. {{ missing ? 'Nothing lives at this address. It may be mistyped, or the page has moved.' : 'This page did not load. Try again in a moment.' }}
    </p>
    <div ref="stage" class="stage" aria-hidden="true">
      <canvas ref="canvas" width="0" height="0" />
      <noscript v-html="fallback" />
    </div>
  </main>
  <SiteFooter />
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin-left: -10px;
  padding: 0 12px 0 10px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.arrow {
  font-size: 18px;
  color: var(--ink-3);
}
@media (hover: hover) and (pointer: fine) {
  .back:hover {
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }
}
.back:active {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
  transform: scale(0.97);
}
@media (pointer: coarse) {
  .back {
    min-height: 44px;
  }
}
.lost {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
}
.stage {
  position: relative;
  flex: 1;
  width: min(1040px, calc(100% - 2 * max(24px, env(safe-area-inset-left), env(safe-area-inset-right))));
  margin: 104px auto 56px;
}
canvas {
  position: absolute;
  inset: 0;
  margin: auto;
  image-rendering: pixelated;
}
.stage :deep(.plain) {
  margin: 0;
  font-size: clamp(120px, 28vw, 360px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
  text-align: center;
  color: var(--ink);
}
@media (max-width: 640px) {
  .stage {
    width: calc(100% - 40px);
    margin: 96px auto 48px;
  }
}
</style>
