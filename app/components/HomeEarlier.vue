<script setup lang="ts">
import { earlier } from '#shared/work'

const older = [...earlier].sort((a, b) => Number(b.year) - Number(a.year))
</script>

<template>
  <div class="home-earlier">
    <a v-for="e in older" :key="e.href" class="row" :href="e.href" rel="noopener">
      <span>
        <span class="row-name">{{ e.name }}</span>
        <span class="row-what">{{ e.note }}</span>
      </span>
      <span class="row-when">
        <span v-if="e.stars != null" class="stars">{{ e.stars.toLocaleString('en-US') }} stars</span><time :datetime="e.year">{{ e.year }}</time>
      </span>
    </a>
  </div>
</template>

<style scoped>
.home-earlier {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--s7);
}

@media (max-width: 900px) {
  .home-earlier {
    grid-template-columns: minmax(0, 1fr);
  }
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: var(--s4);
  padding: 14px 0;
  border-top: 1px solid var(--line);
  text-decoration: none;
  transition: opacity 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .home-earlier:hover .row:not(:hover) {
    opacity: 0.55;
  }
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--s1);
  }
}

.row-name {
  display: block;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}

.row-what {
  display: block;
  font-size: var(--t-small);
  line-height: 1.45;
}

.row-when {
  font-size: var(--t-small);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--ink-3);
}

.stars {
  margin-right: var(--s3);
}
</style>
