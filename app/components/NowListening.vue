<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { Track } from '#shared/types'

const emit = defineEmits<{ unavailable: [] }>()

const root = ref<HTMLElement | null>(null)
const { data, state } = usePolling<Track[]>('/api/listening', root, () => 30_000)
const now = useNow()

const SKELETON = [['48%', '30%'], ['72%', '44%'], ['56%', '34%']] as const
const fullDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

// Apple resizes art by path
const sized = (url: string, px: number) => url.replace(/\/\d+x\d+bb\.jpg$/, `/${px}x${px}bb.jpg`)
const smallArt = (url: string) => sized(url, 174)
const brokenArt = shallowReactive(new Set<string>())
const loadedArt = shallowReactive(new Set<string>())

const tracks = computed(() => {
  const seen = new Set<string>()
  return (data.value ?? []).filter(t => !seen.has(t.url) && !!seen.add(t.url)).slice(0, 4)
})

const rows = computed(() => tracks.value.map((t) => {
  const art = t.art ? [smallArt(t.art), t.art].find(src => !brokenArt.has(src)) ?? null : null
  // the newest track is shown large, so it takes the full-size art first
  const cover = t.art ? [t.art, smallArt(t.art)].find(src => !brokenArt.has(src)) ?? null : null
  // a 36 px row takes the 64 px file on an ordinary screen and the 174 px one on a sharper screen
  const artSet = t.art && art === smallArt(t.art) ? `${sized(t.art, 64)} 64w, ${art} 174w` : undefined
  return { ...t, key: t.url, art, artSet, cover }
}))

const latest = computed(() => rows.value[0])

const eq = ref<ComponentPublicInstance | null>(null)
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
  for (const bar of (eq.value?.$el as HTMLElement | undefined)?.getAnimations({ subtree: true }) ?? []) {
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
      <h3 class="label">
        <NowListeningEq :key="run" ref="eq" :playing="latest?.nowPlaying" :running="running" @barend="onBarEnd" />{{ latest?.nowPlaying ? 'Listening' : 'Recently played' }}
      </h3>
    </div>

    <div v-if="state === 'loading'" class="skeleton" aria-hidden="true">
      <div class="latest">
        <span class="cover"><NowListeningArt large blank :size="148" /></span>
        <span class="words">
          <span class="bar" style="width: 62%; height: 14px" />
          <span class="bar" style="width: 38%" />
        </span>
      </div>
      <ul class="rows">
        <li v-for="(widths, i) in SKELETON" :key="i" class="row">
          <NowListeningArt blank :size="36" />
          <span class="text">
            <span class="title"><span class="bar" :style="{ width: widths[0] }" /></span>
            <span class="sub"><span class="bar" :style="{ width: widths[1] }" /></span>
          </span>
          <span class="when"><span class="bar" style="width: 44px" /></span>
        </li>
      </ul>
    </div>

    <template v-else>
      <a v-if="latest" class="latest" :href="latest.url" rel="noopener">
        <span class="cover">
          <img v-if="latest.cover && loadedArt.has(latest.cover)" class="glow" :src="latest.cover" alt="" aria-hidden="true">
          <NowListeningArt
            large
            :size="148"
            :src="latest.cover"
            :loaded="!!latest.cover && loadedArt.has(latest.cover)"
            @load="loadedArt.add(latest.cover!)"
            @error="brokenArt.add(latest.cover!)"
          />
          <NowListeningMotion v-if="latest.motion" :key="latest.motion" :src="latest.motion" />
        </span>
        <span class="words">
          <span class="title" dir="auto">{{ latest.title }}</span>
          <span class="sub"><span class="sr-only">by </span><span dir="auto">{{ latest.artist }}</span></span>
          <time v-if="latest.playedAt" class="meta" :datetime="iso(latest.playedAt)" :title="fullDate.format(latest.playedAt)">{{ ago(latest.playedAt) }}</time>
          <span v-else-if="latest.nowPlaying" class="meta">Now</span>
        </span>
      </a>

      <TransitionGroup tag="ul" name="track" class="rows" role="list" @before-leave="pinLeaving">
        <li v-for="r in rows.slice(1)" :key="r.key">
          <a class="row link" :href="r.url" rel="noopener">
            <NowListeningArt
              :size="36"
              :src="r.art"
              :srcset="r.artSet"
              sizes="36px"
              lazy
              :loaded="!!r.art && loadedArt.has(r.art)"
              @load="loadedArt.add(r.art!)"
              @error="brokenArt.add(r.art!)"
            />
            <span class="text">
              <span class="title" dir="auto">{{ r.title }}</span>
              <span class="sub"><span class="sr-only">by </span><span dir="auto">{{ r.artist }}</span></span>
            </span>
            <time v-if="r.playedAt" class="when meta" :datetime="iso(r.playedAt)" :title="fullDate.format(r.playedAt)">{{ ago(r.playedAt) }}</time>
          </a>
        </li>
      </TransitionGroup>
    </template>
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
  margin-bottom: var(--s2);
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--t-small);
  font-weight: 500;
  line-height: 1.4;
  color: var(--ink-3);
}

/* the newest track, large, lit from behind by its own cover */
.latest {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  align-items: end;
  gap: 22px;
  color: inherit;
  text-decoration: none;
}

.latest:focus-visible {
  border-radius: var(--r2);
}

@media (max-width: 640px) {
  .latest {
    grid-template-columns: 112px minmax(0, 1fr);
    gap: var(--s4);
  }
}

.cover {
  position: relative;
  isolation: isolate;
}

.glow {
  position: absolute;
  inset: -6px;
  z-index: -1;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  border-radius: 30px;
  object-fit: cover;
  filter: blur(44px) saturate(1.5);
  opacity: 0.5;
  pointer-events: none;
}

.words {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.skeleton .words {
  gap: 10px;
}

.rows {
  position: relative;
  display: grid;
  margin: 26px 0 0;
  padding: 0;
  border-top: 1px solid var(--line);
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 11px 0;
  border-bottom: 1px solid var(--line);
  color: inherit;
  text-decoration: none;
  transition: opacity 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .rows:hover .link:not(:hover) {
    opacity: 0.45;
  }
}

.row:focus-visible {
  border-radius: var(--r1);
}

@media (prefers-reduced-motion: reduce) {
  .row {
    transition: none;
  }
}

.text {
  display: grid;
  min-width: 0;
}

.title {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.words .title {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;
  white-space: normal;
}

.sub {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.4;
  color: var(--ink-3);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.words .sub {
  font-size: 16px;
}

.words .meta {
  margin-top: var(--s2);
}

.bar {
  display: inline-block;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  vertical-align: middle;
}

.track-move {
  transition: transform 250ms var(--ease-in-out);
}

@media (prefers-reduced-motion: reduce) {
  .track-move {
    transition: none;
  }
}

.track-enter-active {
  transition:
    transform 250ms var(--ease-out),
    opacity 200ms var(--ease-out);
}

.track-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .track-enter-from {
    transform: none;
  }
}

.track-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 160ms var(--ease-out);
}

.track-leave-to {
  opacity: 0;
}
</style>
