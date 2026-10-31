<script setup lang="ts">
import type { Track } from '#shared/types'

const emit = defineEmits<{ unavailable: [] }>()

const root = ref<HTMLElement | null>(null)
const { data, state } = usePolling<Track[]>('/api/listening', root, () => 30_000)
const now = useNow()

const SKELETON = [['64%', '38%'], ['48%', '30%'], ['72%', '44%'], ['56%', '34%']] as const
const fullDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

// Last.fm resizes and re-encodes art by path; 174s is 174 px
const smallArt = (url: string) => url.replace(/\/i\/u\/[^/]+\/([0-9a-f]+)\.\w+$/, '/i/u/174s/$1.webp')
const brokenArt = shallowReactive(new Set<string>())
const loadedArt = shallowReactive(new Set<string>())

const tracks = computed(() => {
  const seen = new Set<string>()
  return (data.value ?? []).filter(t => !seen.has(t.url) && !!seen.add(t.url)).slice(0, 4)
})

const rows = computed(() => tracks.value.map((t) => {
  const art = t.art ? [smallArt(t.art), t.art].find(src => !brokenArt.has(src)) ?? null : null
  return { ...t, key: t.url, art }
}))

const latest = computed(() => rows.value[0])

const eq = ref<HTMLElement | null>(null)
const run = ref(0)
const running = ref(false)
let barsDone = 0
let inView = false

function startRun() {
  if (running.value || !inView || !latest.value?.nowPlaying || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  barsDone = 0
  run.value++
  running.value = true
}

// four bars
function onBarEnd() {
  if (++barsDone === 4) running.value = false
}

// alternate: a bar rests after every second iteration
function endRun() {
  for (const bar of eq.value?.getAnimations({ subtree: true }) ?? []) {
    const i = bar.effect?.getComputedTiming().currentIteration
    if (i != null) bar.effect?.updateTiming({ iterations: i % 2 ? i + 1 : i + 2 })
  }
}

watch(() => latest.value?.nowPlaying && latest.value.url, (track) => {
  if (track) startRun()
  else if (running.value) endRun()
})
watch(root, (el, _, onCleanup) => {
  if (!el) {
    inView = false
    running.value = false
    return
  }
  const io = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting
    if (inView) startRun()
  }, { threshold: 0.5 })
  io.observe(el)
  onCleanup(() => io.disconnect())
}, { flush: 'post' })

const unavailable = computed(() => state.value === 'failed' || (state.value === 'ready' && rows.value.length === 0))
watch(unavailable, (gone) => {
  if (gone) emit('unavailable')
})

function pinLeaving(el: Element) {
  const row = el as HTMLElement
  row.style.top = `${row.offsetTop}px`
}

const iso = (t: number) => new Date(t).toISOString()

function ago(at: number) {
  const s = Math.max(0, (now.value - at) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} hr ago`
  return dayLabel(at, now.value)
}
</script>

<template>
  <div v-if="!unavailable" ref="root" class="col">
    <div class="head">
      <h3 class="label" :class="{ playing: latest?.nowPlaying }">
        <span :key="run" ref="eq" class="eq" :class="{ run: running }" aria-hidden="true" @animationend="onBarEnd"><span /><span /><span /><span /></span>{{ latest?.nowPlaying ? 'Listening' : 'Recently played' }}
      </h3>
    </div>

    <ul v-if="state === 'loading'" class="rows skeleton" aria-hidden="true">
      <li v-for="(widths, i) in SKELETON" :key="i" class="row">
        <span class="art" />
        <span class="text">
          <span class="line">
            <span class="title"><span class="bar" :style="{ width: widths[0] }" /></span>
            <span class="when"><span class="bar" style="width: 44px" /></span>
          </span>
          <span class="sub"><span class="bar" :style="{ width: widths[1] }" /></span>
        </span>
      </li>
    </ul>

    <TransitionGroup v-else tag="ul" name="track" class="rows" role="list" @before-leave="pinLeaving">
      <li v-for="r in rows" :key="r.key">
        <a class="row" :href="r.url" rel="noopener">
          <span class="art">
            <span class="i-site-music" aria-hidden="true" />
            <img
              v-if="r.art"
              :src="r.art"
              :class="{ loaded: loadedArt.has(r.art) }"
              alt=""
              width="48"
              height="48"
              loading="lazy"
              decoding="async"
              @load="loadedArt.add(r.art!)"
              @error="brokenArt.add(r.art!)"
            >
          </span>
          <span class="text">
            <span class="line">
              <span class="title" dir="auto">{{ r.title }}</span>
              <time v-if="r.playedAt" class="when meta" :datetime="iso(r.playedAt)" :title="fullDate.format(r.playedAt)">{{ ago(r.playedAt) }}</time>
              <span v-else-if="r.nowPlaying" class="when meta">Now</span>
            </span>
            <span class="sub"><span class="sr-only">by </span><span dir="auto">{{ r.artist }}</span></span>
          </span>
        </a>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.col {
  min-width: 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 28px;
  margin-bottom: 8px;
}
.label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}
.eq {
  display: inline-flex;
  flex: none;
  align-items: flex-end;
  gap: 2px;
  width: 18px;
  height: 12px;
  padding: 0 2px;
  color: var(--ink-3);
  transition: color 160ms ease;
}
.eq span {
  --rest: 0.55;
  --swing: 0.95;
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: currentColor;
  transform-origin: 50% 100%;
  transform: scaleY(var(--rest));
}
.eq span:nth-child(2) { --rest: 1; --swing: 0.35; }
.eq span:nth-child(3) { --rest: 0.75; --swing: 0.3; }
.eq span:nth-child(4) { --rest: 0.4; --swing: 0.9; }
.playing .eq {
  color: var(--accent);
}
.eq.run span {
  animation: eq 0.9s ease-in-out 4 alternate;
}
.eq.run span:nth-child(2) {
  animation-duration: 1.15s;
}
.eq.run span:nth-child(3) {
  animation-duration: 0.8s;
}
.eq.run span:nth-child(4) {
  animation-duration: 1.05s;
}
@keyframes eq {
  from { transform: scaleY(var(--rest)); }
  to { transform: scaleY(var(--swing)); }
}

.rows {
  position: relative;
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: var(--now-row-height, 0);
  margin: 0 -10px;
  padding: 8px 10px;
  border-radius: 14px;
  color: inherit;
  text-decoration: none;
  transition: background-color 150ms;
}
@media (hover: hover) and (pointer: fine) {
  a.row:hover {
    background: color-mix(in srgb, var(--ink) 5%, transparent);
  }
}
a.row:active {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}
a.row:focus-visible {
  border-radius: 14px;
  outline-offset: 0;
}

.art {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface);
  font-size: 20px;
  color: var(--ink-3);
}
.art::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--line);
  pointer-events: none;
}
.art img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}
.art img.loaded {
  opacity: 1;
}

.text {
  display: grid;
  flex: 1;
  min-width: 0;
}
.line {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}
.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.when {
  flex: none;
}
.sub {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-3);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.bar {
  display: inline-block;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  vertical-align: middle;
}
.skeleton .art {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}
.skeleton .when {
  font-size: 14px;
  line-height: 1.45;
}

.track-move {
  transition: transform 250ms var(--ease-in-out);
}
.track-enter-active {
  transition: transform 250ms var(--ease-out), opacity 200ms var(--ease-out);
}
.track-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.track-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 160ms var(--ease-out);
}
.track-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .eq.run span {
    animation: none;
  }
  .track-move {
    transition: none;
  }
  .track-enter-from {
    transform: none;
  }
}
</style>
