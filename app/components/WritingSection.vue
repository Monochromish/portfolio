<script setup lang="ts">
import { latestPosts, postDate } from '#shared/writing'

const props = defineProps<{ page?: boolean }>()

const HOME_LIMIT = 5
const all = latestPosts()
const shown = computed(() => props.page ? all : all.slice(0, HOME_LIMIT))
</script>

<template>
  <section v-if="all.length" id="writing" class="section" :class="{ page }" aria-labelledby="writing-title">
    <component :is="page ? 'h1' : 'h2'" id="writing-title" class="section-title">Writing</component>
    <p class="section-intro">Notes on interfaces, motion and the things I build.</p>
    <div class="section-body">
      <ul class="rows" role="list">
        <li v-for="post in shown" :key="post.slug">
          <NuxtLink :to="`/writing/${post.slug}`" class="row">
            <span class="title">{{ post.title }}</span>
            <time class="meta" :datetime="post.date">{{ postDate(post.date) }}</time>
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink v-if="shown.length < all.length" to="/writing" class="more">
        All writing
        <span class="i-site-send" aria-hidden="true" />
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.page .section-title {
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin: 0 -12px;
  padding: 12px;
  border-radius: 10px;
  color: var(--ink);
  text-decoration: none;
  transition: background-color 150ms, opacity 150ms;
}
.title {
  min-width: 0;
  font-weight: 550;
  line-height: 1.5;
  text-wrap: pretty;
}
.row .meta {
  flex: none;
  white-space: nowrap;
}
.row:focus-visible {
  outline-offset: 0;
  border-radius: 10px;
}
.row:active {
  background: color-mix(in srgb, var(--ink) 7%, transparent);
}
@media (hover: hover) and (pointer: fine) {
  .rows:hover .row {
    opacity: 0.5;
  }
  .rows .row:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--ink) 5%, transparent);
  }
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin-top: 12px;
  color: var(--ink);
  font-weight: 550;
  text-decoration: none;
}
.more span {
  font-size: 18px;
  color: var(--ink-3);
  transition: transform 150ms;
}
@media (hover: hover) and (pointer: fine) {
  .more:hover span {
    transform: translateX(2px);
  }
}
</style>
