<script setup lang="ts">
import type { Film } from '#shared/types'

const emit = defineEmits<{ unavailable: [] }>()

const root = ref<HTMLElement | null>(null)
const { data, state } = usePolling<Film[]>('/api/films', root)
const now = useNow()

const SKELETON = [['58%', '30%'], ['70%', '22%'], ['46%', '34%'], ['62%', '26%']] as const
const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' })

// Letterboxd sizes posters by path; 150x225 covers this 44x66 tile at 3x
const smallPoster = (url: string) => url.replace(/-0-\d+-0-\d+-crop/, '-0-150-0-225-crop')
const brokenPoster = shallowReactive(new Set<string>())
const loadedPoster = shallowReactive(new Set<string>())

const rows = computed(() => (data.value ?? []).slice(0, 4).map((f, i) => ({
  ...f,
  key: `${f.url}#${i}`,
  poster: f.poster ? [smallPoster(f.poster), f.poster].find(src => !brokenPoster.has(src)) ?? null : null,
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
        <span class="i-site-film" aria-hidden="true" />Recently watched
      </h3>
    </div>

    <ul v-if="state === 'loading'" class="rows skeleton" aria-hidden="true">
      <li v-for="(widths, i) in SKELETON" :key="i" class="row">
        <span class="poster" />
        <span class="text">
          <span class="line">
            <span class="title"><span class="bar" :style="{ width: widths[0] }" /></span>
            <span class="when"><span class="bar" style="width: 40px" /></span>
          </span>
          <span class="sub"><span class="bar" :style="{ width: widths[1] }" /></span>
        </span>
      </li>
    </ul>

    <ul v-else class="rows" role="list">
      <li v-for="f in rows" :key="f.key">
        <a class="row" :href="f.url" rel="noopener">
          <span class="poster">
            <span class="i-site-film" aria-hidden="true" />
            <img
              v-if="f.poster"
              :src="f.poster"
              :class="{ loaded: loadedPoster.has(f.poster) }"
              alt=""
              width="44"
              height="66"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @load="loadedPoster.add(f.poster!)"
              @error="brokenPoster.add(f.poster!)"
            >
          </span>
          <span class="text">
            <span class="line">
              <span class="title" dir="auto">{{ f.title }}</span>
              <span v-if="f.day" class="sr-only">, watched </span><time v-if="f.day" class="when meta" :datetime="f.watchedOn!" :title="longDate.format(f.day)">{{ watchedLabel(f.day) }}</time>
            </span>
            <span class="sub">
              <span v-if="f.year" class="meta"><span class="sr-only">, from </span>{{ f.year }}</span>
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
.label > span {
  font-size: 18px;
  color: var(--ink-3);
}

.rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* 44 + 18 aligns the text with Listening (48 + 14) */
.row {
  display: flex;
  align-items: center;
  gap: 18px;
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

.poster {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 66px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--surface);
  font-size: 20px;
  color: var(--ink-3);
}
.poster::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--line);
  pointer-events: none;
}
.poster img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}
.poster img.loaded {
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
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 20px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-3);
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
  color: var(--accent);
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
.skeleton .poster {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}
.skeleton .sub {
  display: block;
}
.skeleton .when {
  font-size: 14px;
  line-height: 1.45;
}
</style>
