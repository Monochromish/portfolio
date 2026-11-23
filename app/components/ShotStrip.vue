<script setup lang="ts">
import type { Shot } from '#shared/work'

// eager: the project is about to open, so load and decode now, not mid-animation.
// tall: every screenshot is taller than it is wide, so the strip is given more height to show them at a readable size
const props = defineProps<{ shots: Shot[], label: string, eager?: boolean, tall?: boolean }>()
const dark = useState<boolean>('dark', () => false)

const strip = ref<HTMLElement>()
const atStart = ref(true)
const atEnd = ref(false)

const src = (file: string, width: number) => `/work/${file}-${width}.webp`
const srcset = (file: string, widths: number[]) => widths.map(w => `${src(file, w)} ${w}w`).join(', ')
const pictures = (shot: Shot) => shot.light
  ? [{ file: shot.file, alt: shot.alt, only: 'dark' }, { file: shot.light.file, alt: shot.light.alt, only: 'light' }]
  : [{ file: shot.file, alt: shot.alt, only: null }]

function measure() {
  const el = strip.value
  if (!el) return
  atStart.value = el.scrollLeft < 4
  atEnd.value = el.scrollLeft > el.scrollWidth - el.clientWidth - 4
}

// native smooth scroll, so a new press or a swipe interrupts it
function step(by: number) {
  const el = strip.value
  if (!el) return
  const edge = el.getBoundingClientRect().left
  const starts = [...el.children].map(slide => slide.getBoundingClientRect().left - edge + el.scrollLeft)
  const to = by > 0 ? starts.find(x => x > el.scrollLeft + 4) : starts.findLast(x => x < el.scrollLeft - 4)
  if (to === undefined) return
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({ left: to, behavior: smooth ? 'smooth' : 'auto' })
}

// only the theme in use; the other version is never shown
const wanted = (only: string | null) => props.eager && (!only || only === (dark.value ? 'dark' : 'light'))

watch(() => props.eager, async (eager) => {
  if (!eager) return
  await nextTick()
  for (const img of strip.value?.querySelectorAll('img') ?? []) {
    // decode() rejects when the file fails to load, which the img element already shows by itself
    if (img.loading === 'eager') img.decode().catch(() => {})
  }
})

onMounted(measure)
</script>

<template>
  <div class="shots" :class="{ tall }">
    <ul ref="strip" class="strip" role="list" :aria-label="label" :tabindex="props.shots.length > 1 ? 0 : undefined" @scroll.passive="measure">
      <li v-for="shot in props.shots" :key="shot.file" class="slide">
        <img
          v-for="pic in pictures(shot)"
          :key="pic.file"
          class="shot"
          :class="pic.only && `only-${pic.only}`"
          :src="src(pic.file, shot.widths[0]!)"
          :srcset="srcset(pic.file, shot.widths)"
          sizes="(max-width: 688px) 80vw, 510px"
          :width="shot.width"
          :height="shot.height"
          :alt="pic.alt"
          :loading="wanted(pic.only) ? 'eager' : 'lazy'"
          decoding="async"
        >
      </li>
    </ul>
    <div v-if="props.shots.length > 1" class="steps">
      <button type="button" class="step" aria-label="Previous screenshot" :aria-disabled="atStart ? 'true' : undefined" @click="step(-1)">
        <span class="i-site-arrow-left" aria-hidden="true" />
      </button>
      <button type="button" class="step" aria-label="Next screenshot" :aria-disabled="atEnd ? 'true' : undefined" @click="step(1)">
        <span class="i-site-arrow-left next" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 12px;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  border-radius: var(--r2);
}

.strip::-webkit-scrollbar {
  display: none;
}

/* one height for every screenshot; a 16:9 one comes to 86% of the column, so the next shows its edge */
.slide {
  flex: none;
  height: clamp(180px, 46vw, 288px);
  scroll-snap-align: start;
}

.tall .slide {
  height: clamp(300px, 70vw, 460px);
}

.shot {
  display: block;
  width: auto;
  max-width: none;
  height: 100%;
  border-radius: var(--r2);
  outline: 1px solid var(--line);
  outline-offset: -1px;
}

.shot.only-dark,
:root.dark .shot.only-light {
  display: none;
}

:root.dark .shot.only-dark {
  display: block;
}

.steps {
  display: flex;
  justify-content: flex-end;
  gap: var(--s1);
  margin-top: var(--s2);
}

.step {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--r2);
  font-size: 18px;
  color: var(--ink);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    opacity 150ms ease,
    transform 160ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .step:not([aria-disabled='true']):hover {
    background: var(--fill);
  }
}

.step:active {
  transform: scale(0.97);
}

.step[aria-disabled='true'] {
  opacity: 0.35;
  cursor: default;
}

.step[aria-disabled='true']:active {
  transform: none;
}

.next {
  rotate: 180deg;
}
</style>
