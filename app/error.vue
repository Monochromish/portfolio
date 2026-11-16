<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const status = computed(() => props.error.status || 500)
const missing = computed(() => status.value === 404)
const title = computed(() => missing.value ? 'Page not found' : 'Something went wrong')
const { name } = useIdentity()

const POEM = [
  'Nothing is here, and no one left it empty but me.',
  'I am only what I have made, and I have not made this page.',
  'I wanted something that mattered here, and I confess it is not.',
  'I am trying. You arrived before I did.',
]

useSeoMeta({
  title: () => `${title.value} · ${name}`,
  robots: 'noindex',
})
useToolbarTint()

const referer = useRequestHeaders(['referer']).referer
const origin = useRequestURL().origin
function sameOrigin(url: string | undefined) {
  try {
    return !!url && new URL(url).origin === origin
  }
  catch {
    return false
  }
}
const fromSite = useState('error-from-site', () => import.meta.client ? !!history.state?.back || sameOrigin(document.referrer) : sameOrigin(referer))

const plain = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

function previous(e: MouseEvent) {
  if (!plain(e)) return
  e.preventDefault()
  let fromSite = false
  try {
    fromSite = new URL(document.referrer).origin === location.origin
  }
  catch {
    fromSite = false
  }
  if (history.state?.back || (fromSite && history.length > 1)) history.back()
  else clearError({ redirect: '/' })
}

function home(e: MouseEvent) {
  if (!plain(e)) return
  e.preventDefault()
  clearError({ redirect: '/' })
}
</script>

<template>
  <a class="skip" href="#content">Skip to content</a>
  <NuxtRouteAnnouncer />
  <SiteHeader>
    <template v-if="fromSite" #lead>
      <a href="/" class="back" @click="previous">
        <span class="i-site-arrow-left arrow" aria-hidden="true" />
        Previous
      </a>
    </template>
  </SiteHeader>
  <main id="content" class="lost">
    <p class="code" aria-hidden="true">{{ status }}</p>
    <h1 class="page-title title">{{ title }}</h1>
    <p v-if="missing" class="lead poem">
      <span class="sr-only">Error {{ status }}. </span>
      <span v-for="line in POEM" :key="line">{{ line }}</span>
    </p>
    <p v-else class="lead">
      <span class="sr-only">Error {{ status }}. </span>This page did not load. Try again in a moment.
    </p>
    <ul class="links">
      <li><a class="button" href="/" @click="home">Home</a></li>
      <li v-if="fromSite"><a class="text-link" href="/" @click="previous">Previous page</a></li>
    </ul>
    <div class="end">
      <SiteFooter />
    </div>
  </main>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin-left: -10px;
  padding: 0 12px 0 10px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.arrow {
  font-size: 18px;
  color: var(--ink-3);
}
@media (hover: hover) and (pointer: fine) {
  .back:hover {
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }
}
.back:active {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
  transform: scale(0.97);
}
@media (pointer: coarse) {
  .back {
    min-height: 44px;
  }
}

/* 76 px clears the fixed header */
.lost {
  display: flex;
  flex-direction: column;
  max-width: 40rem;
  min-height: 100svh;
  margin: 0 auto;
  padding: calc(76px + var(--s8)) max(var(--s5), env(safe-area-inset-right)) var(--s7) max(var(--s5), env(safe-area-inset-left));
  line-height: 1.65;
}
/* pulled left so the first stroke meets the text edge */
.code {
  margin: 0 0 0 -0.04em;
  font-family: var(--font-display);
  font-size: clamp(72px, 12vw, 112px);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 0.9;
  letter-spacing: -0.03em;
  color: var(--ink);
}
.title {
  margin-top: var(--s5);
}
.lead {
  margin: var(--s3) 0 0;
}
/* a long line wraps with a hanging indent, so it still reads as one line */
.poem > span:not(.sr-only) {
  display: block;
  padding-left: 1em;
  text-indent: -1em;
}
.links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s2) var(--s5);
  margin: var(--s5) 0 0;
  padding: 0;
  list-style: none;
}
/* the footer keeps to the bottom of a short page */
.end {
  margin-top: auto;
  padding-top: var(--s8);
}
</style>
