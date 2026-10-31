<script setup lang="ts">
import { findPost, postBodies, postDate } from '#shared/writing'

const route = useRoute()
const slug = String(route.params.slug)
const post = findPost(slug)
const load = postBodies[slug]
if (!post || !load) throw createError({ status: 404, statusText: 'Page not found', fatal: true })

const { title, date, summary } = post
const Body = defineAsyncComponent(load)

const url = `${useRuntimeConfig().public.siteUrl}/writing/${slug}`
const { name } = useIdentity()
useSeoMeta({
  title: `${title} · ${name}`,
  description: summary,
  ogTitle: title,
  ogDescription: summary,
  ogType: 'article',
  ogUrl: url,
  articlePublishedTime: date,
})
useHead({ link: [{ rel: 'canonical', href: url }] })
</script>

<template>
  <main id="content" class="shell">
    <article class="article" aria-labelledby="post-title">
      <header class="head">
        <h1 id="post-title">{{ title }}</h1>
        <p class="meta">
          <time :datetime="date">{{ postDate(date, 'long') }}</time>
        </p>
        <p class="summary">{{ summary }}</p>
      </header>
      <div class="prose">
        <component :is="Body" />
      </div>
      <footer class="foot">
        <NuxtLink to="/writing" class="more">
          All writing
          <span class="i-site-send" aria-hidden="true" />
        </NuxtLink>
      </footer>
    </article>
  </main>
  <SiteFooter />
</template>

<style scoped>
.shell {
  padding-top: 48px;
}
.article {
  /* the site column, about 72 characters a line at 17px */
  max-width: 40rem;
  margin: 0 auto;
  padding: 104px 24px 0;
}
.head {
  padding-bottom: 32px;
  margin-bottom: 40px;
  border-bottom: 1px solid var(--line);
}
h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
.head .meta {
  margin: 12px 0 0;
}
.summary {
  margin: 18px 0 0;
  font-size: 18.5px;
  line-height: 1.55;
  color: var(--ink-3);
}

.prose {
  font-size: 17px;
  line-height: 1.7;
  color: var(--ink-2);
}
.prose :deep(:is(p, ul, ol, blockquote, pre, figure, table)) {
  margin: 0 0 1.15em;
}
.prose :deep(h2) {
  margin: 2.2em 0 0.55em;
  font-size: 19px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.01em;
}
.prose :deep(h3) {
  margin: 1.9em 0 0.45em;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.45;
}
.prose :deep(:is(h2, h3)) {
  color: var(--ink);
  /* clears the fixed header */
  scroll-margin-top: 96px;
}
.prose :deep(:is(h2, h3):first-child) {
  margin-top: 0;
}
.prose :deep(a) {
  color: var(--ink);
  text-decoration-line: underline;
  text-decoration-color: color-mix(in srgb, var(--ink) 30%, transparent);
  transition: text-decoration-color 150ms;
}
@media (hover: hover) and (pointer: fine) {
  .prose :deep(a:hover) {
    text-decoration-color: var(--ink);
  }
}
.prose :deep(strong) {
  font-weight: 650;
  color: var(--ink);
}
.prose :deep(ul) {
  padding-left: 1.25em;
  list-style: disc;
}
.prose :deep(ol) {
  padding-left: 1.4em;
  list-style: decimal;
}
.prose :deep(li) {
  margin: 0.35em 0;
  padding-left: 0.2em;
}
.prose :deep(li::marker) {
  color: var(--ink-3);
}
.prose :deep(blockquote) {
  padding-left: 1em;
  border-left: 2px solid var(--line-strong);
  color: var(--ink-3);
}
.prose :deep(hr) {
  margin: 2.4em 0;
  border: 0;
  border-top: 1px solid var(--line);
}
.prose :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.86em;
}
.prose :deep(:not(pre) > code) {
  padding: 0.12em 0.36em;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: var(--ink);
}
.prose :deep(pre) {
  padding: 16px 18px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font-size: 14.5px;
  line-height: 1.6;
  tab-size: 2;
}
.prose :deep(pre code) {
  font-size: inherit;
}
.prose :deep(:is(img, video)) {
  border-radius: 8px;
}
.prose :deep(figure) {
  margin: 2em 0;
}
.prose :deep(figcaption) {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-3);
}

.foot {
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  font-size: 16px;
  font-weight: 550;
  color: var(--ink);
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
@media (max-width: 640px) {
  .article {
    padding: 72px 20px 0;
  }
  h1 {
    font-size: 26px;
  }
}
</style>
