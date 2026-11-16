<script setup lang="ts">
import { latestPosts, postDate } from '#shared/writing'

const props = defineProps<{ page?: boolean }>()

const HOME_LIMIT = 5
const all = latestPosts()
const shown = computed(() => props.page ? all : all.slice(0, HOME_LIMIT))
</script>

<template>
  <section v-if="all.length" id="writing" class="section" aria-labelledby="writing-title">
    <component :is="page ? 'h1' : 'h2'" id="writing-title" :class="page ? 'page-title' : 'label'">Writing</component>
    <p v-if="page" class="intro">Notes on interfaces, motion and the things I build.</p>
    <ul class="rows" role="list">
      <li v-for="post in shown" :key="post.slug">
        <NuxtLink :to="`/writing/${post.slug}`" class="row">
          <span class="title">{{ post.title }}</span>
          <time class="when" :datetime="post.date">{{ postDate(post.date) }}</time>
        </NuxtLink>
      </li>
    </ul>
    <p v-if="shown.length < all.length" class="all">
      <NuxtLink to="/writing" class="text-link">All writing</NuxtLink>
    </p>
  </section>
</template>

<style scoped>
.intro {
  max-width: 31rem;
  margin: var(--s3) 0 var(--s6);
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: var(--s4);
  margin: 0 calc(var(--s3) * -1);
  padding: 10px var(--s3);
  border-radius: var(--r2);
  text-decoration: none;
  transition: background-color 150ms ease;
}
.title {
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
  text-wrap: pretty;
}
.when {
  font-size: var(--t-small);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--ink-3);
}
.row:focus-visible {
  outline-offset: 0;
  border-radius: var(--r2);
}
@media (hover: hover) and (pointer: fine) {
  .row:hover {
    background: var(--fill);
  }
}
.row:active {
  background: var(--fill-hover);
}
.all {
  margin: var(--s3) 0 0;
}
</style>
