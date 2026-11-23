<script setup lang="ts">
import type { Film } from '#shared/types'

const emit = defineEmits<{ unavailable: [] }>()

const root = ref<HTMLElement | null>(null)
const { data, state } = usePolling<Film[]>('/api/films', root)
const now = useNow()

const SKELETON = ['78%', '92%', '64%', '84%'] as const
const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' })

// Letterboxd sizes posters by path; the browser takes the smallest of these that is still sharp on its screen
const sized = (url: string, w: number) => url.replace(/-0-\d+-0-\d+-crop/, `-0-${w}-0-${w * 1.5}-crop`)
const smallPoster = (url: string) => sized(url, 460)
const posterSet = (url: string) => [150, 230, 460].map(w => `${sized(url, w)} ${w}w`).join(', ')
const brokenPoster = shallowReactive(new Set<string>())
const loadedPoster = shallowReactive(new Set<string>())

const rows = computed(() => (data.value ?? []).slice(0, 4).map((f, i) => ({
  ...f,
  key: `${f.url}#${i}`,
  poster: f.poster ? [smallPoster(f.poster), f.poster].find(src => !brokenPoster.has(src)) ?? null : null,
  // only while the sized files load; a poster that fell back to its original has no sizes to choose from
  posterSet: f.poster && !brokenPoster.has(smallPoster(f.poster)) ? posterSet(f.poster) : undefined,
  day: f.watchedOn ? watchedDay(f.watchedOn) : null,
})))

const unavailable = computed(() => state.value === 'failed' || (state.value === 'ready' && rows.value.length === 0))
watch(unavailable, (gone) => {
  if (gone) emit('unavailable')
})

function watchedDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

const watchedLabel = (day: Date) => dayLabel(day, now.value)

const stars = (rating: number) => [1, 2, 3, 4, 5].map(i => rating >= i ? 'full' : rating >= i - 0.5 ? 'half' : 'empty')
</script>

<template>
  <div v-if="!unavailable" ref="root" class="col">
    <div class="head">
      <h3 class="label">
        Recently watched
      </h3>
    </div>

    <ul v-if="state === 'loading'" class="films skeleton" aria-hidden="true">
      <li v-for="(width, i) in SKELETON" :key="i" class="film">
        <span class="poster" />
        <span class="title"><span class="bar" :style="{ width }" /></span>
        <span class="sub"><span class="bar" style="width: 52%" /></span>
      </li>
    </ul>

    <ul v-else class="films" role="list">
      <li v-for="f in rows" :key="f.key">
        <a class="film link" :href="f.url" rel="noopener">
          <span class="poster">
            <span class="i-site-film" aria-hidden="true" />
            <img
              v-if="f.poster"
              :src="f.poster"
              :srcset="f.posterSet"
              sizes="(max-width: 899px) 22vw, 150px"
              class="cover"
              :class="{ loaded: loadedPoster.has(f.poster) }"
              alt=""
              width="230"
              height="345"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @load="loadedPoster.add(f.poster!)"
              @error="brokenPoster.add(f.poster!)"
            >
          </span>
          <span class="title" dir="auto">{{ f.title }}</span>
          <span class="sub">
            <span v-if="f.year" class="meta"><span class="sr-only">, from </span>{{ f.year }}</span>
            <span v-if="f.day" class="meta"><span class="sr-only">, watched </span><time :datetime="f.watchedOn!" :title="longDate.format(f.day)">{{ watchedLabel(f.day) }}</time></span>
            <span v-if="f.rating !== null" class="stars">
              <span v-for="(s, i) in stars(f.rating)" :key="i" class="star" :class="s" aria-hidden="true">
                <span class="i-site-star" />
                <span v-if="s === 'half'" class="i-site-star-half" />
              </span>
              <span class="sr-only">, rated {{ f.rating }} out of 5</span>
            </span>
            <template v-if="f.liked">
              <span class="i-site-heart-fill liked" aria-hidden="true" /><span class="sr-only">, liked</span>
            </template>
            <template v-if="f.rewatch">
              <span class="i-site-rewatch rewatch" aria-hidden="true" /><span class="sr-only">, rewatched</span>
            </template>
          </span>
        </a>
      </li>
    </ul>
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

.films {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 640px) {
  .films {
    gap: var(--s3);
  }
}

.film {
  display: block;
  color: inherit;
  text-decoration: none;
  transition: opacity 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .films:hover .link:not(:hover) {
    opacity: 0.45;
  }
}

.link:focus-visible {
  border-radius: var(--r2);
}

@media (prefers-reduced-motion: reduce) {
  .film {
    transition: none;
  }
}

.poster {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: 10px;
  background: var(--surface);
  font-size: 26px;
  color: var(--ink-3);
  transition: transform 220ms var(--ease-out);
}

.poster::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--line);
  pointer-events: none;
}

.skeleton .poster {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

@media (hover: hover) and (pointer: fine) {
  .link:hover .poster {
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .poster {
    transition: none;
  }
}

.cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}

.cover.loaded {
  opacity: 1;
}

.title {
  display: block;
  margin-top: var(--s3);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
}

@media (max-width: 640px) {
  .title {
    font-size: 14px;
  }
}

.sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--s2);
  min-height: 20px;
  margin-top: 2px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-3);
}

.skeleton .sub {
  display: block;
}

.stars {
  display: inline-flex;
  gap: 1px;
}

.star {
  position: relative;
  display: inline-grid;
  font-size: 13px;
  color: var(--line-strong);
}

.star.full {
  color: var(--ink-2);
}

.star .i-site-star-half {
  position: absolute;
  inset: 0;
  color: var(--ink-2);
}

.liked {
  font-size: 14px;
  color: var(--ink-2);
}

.rewatch {
  font-size: 15px;
  color: var(--ink-3);
}

.bar {
  display: inline-block;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  vertical-align: middle;
}
</style>
