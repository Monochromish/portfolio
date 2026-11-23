<script setup lang="ts">
import type { Project, Shot } from '#shared/work'

defineProps<{
  points: string[]
  shots: Shot[]
  label: string
  eager: boolean
  tall?: boolean
  note?: string
  footnote?: Project['footnote']
  cited?: boolean
}>()
</script>

<template>
  <div class="home-work-more" :class="{ solo: !shots.length }">
    <ul class="points">
      <li v-for="point in points" :key="point" class="point">{{ point }}</li>
    </ul>
    <ShotStrip v-if="shots.length" class="pictures" :shots="shots" :label="label" :eager="eager" :tall="tall" />
    <p v-if="footnote" :id="footnote.id" class="small" :class="{ cited }">
      * {{ footnote.text }}<template v-if="footnote.link">{{ ' ' }}<a class="text-link reach" :href="footnote.link.href" rel="noopener">{{ footnote.link.label }}</a>.</template>
    </p>
    <p v-else-if="note" class="small">{{ note }}</p>
  </div>
</template>

<style scoped>
/* what was done on the left, what it looks like on the right */
.home-work-more {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: var(--s5) 40px;
}

.home-work-more.solo {
  grid-template-columns: minmax(0, 42rem);
}

@media (max-width: 900px) {
  .home-work-more {
    grid-template-columns: minmax(0, 1fr);
  }
}

.points {
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.point {
  position: relative;
  padding-left: var(--s4);
  font-size: 15px;
  line-height: 1.6;
}

.point::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.75em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ink-3);
}

.point + .point {
  margin-top: var(--s2);
}

.pictures {
  min-width: 0;
  margin: 0;
}

.small {
  grid-column: 1 / -1;
  min-width: 0;
  margin: 0;
  scroll-margin-top: var(--s7);
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-3);
}

/* the mark reaches a little past the text, and goes as slowly as it came quickly */
.small[id] {
  margin: calc(var(--s2) * -1) calc(var(--s3) * -1);
  padding: var(--s2) var(--s3);
  border-radius: var(--r1);
  transition:
    background-color 900ms ease,
    color 900ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .small[id] {
    transition: none;
  }
}

.cited {
  background: var(--fill-hover);
  color: var(--ink);
  transition-duration: 150ms;
}
</style>
