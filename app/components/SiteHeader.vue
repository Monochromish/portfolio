<script setup lang="ts">
import { posts } from '#shared/writing'

const { toggle, dark } = useTheme()
const { morphing, disk, rays } = useSunMoon(dark)
const { name } = useIdentity()
const route = useRoute()
const error = useError()
const solid = computed(() => route.path !== '/' || !!error.value)
const introPassed = useIntroPassed()
const showName = computed(() => solid.value || introPassed.value)
const links: { label: string, href: string, section?: string }[] = [
  { label: 'Work', href: '/#work', section: 'work' },
  ...(posts.length ? [{ label: 'Writing', href: '/#writing', section: 'writing' }] : []),
  { label: 'About', href: '/#about', section: 'about' },
  { label: 'Resume', href: '/Himanshu_Adwani_Resume.pdf' },
]

const surface = useToolbarSurface()
const reading = useActiveSection(links.flatMap(l => l.section ? [l.section] : []))
const current = computed(() => {
  if (error.value) return null
  if (/^\/writing(\/|$)/.test(route.path)) return links.some(l => l.section === 'writing') ? 'writing' : null
  return surface.value === 'paper' ? reading.value : null
})

const mark = ref<HTMLElement>()
let shownAt: string | null = null
let hiddenAt = -1e9
let sizer: ResizeObserver | undefined

// the chip is 30 px tall; an entrance starts it as a smaller pill that settles into a 10 px radius
function aim(section: string, entrance = false) {
  const el = mark.value!
  const item = el.children[links.findIndex(l => l.section === section)]?.firstElementChild as HTMLElement | undefined
  if (!item) return
  const dx = entrance ? item.offsetWidth * 0.06 : 0
  const v = Math.max(0, (item.offsetHeight - 30) / 2) + (entrance ? 2 : 0)
  const left = item.offsetLeft + dx
  const right = el.clientWidth - item.offsetLeft - item.offsetWidth + dx
  el.style.clipPath = `inset(${v}px ${right}px ${v}px ${left}px round ${entrance ? 15 : 10}px)`
  el.style.transformOrigin = `${item.offsetLeft + item.offsetWidth / 2}px 50%`
}

function jump(section: string, entrance = false) {
  const el = mark.value!
  el.classList.add('instant')
  aim(section, entrance)
  void el.offsetWidth
  el.classList.remove('instant')
}

let keyedAt = -1e9
function onNavClick(e: MouseEvent) {
  if (e.detail === 0) keyedAt = performance.now()
}

function place(section: string | null) {
  const el = mark.value
  if (!el) return
  if (!section) {
    if (el.dataset.state === 'shown') hiddenAt = performance.now()
    delete el.dataset.enter
    el.dataset.state = 'hidden'
    return
  }
  if (performance.now() - keyedAt < 1000) {
    el.classList.add('instant')
    delete el.dataset.enter
    el.dataset.state = 'shown'
    aim(section)
    void el.offsetWidth
    el.classList.remove('instant')
    shownAt = section
    return
  }
  // 150ms: the chip's fade-out
  const entering = el.dataset.state !== 'shown' && performance.now() - hiddenAt > 150
  if (entering) {
    jump(section, true)
    el.dataset.enter = ''
  }
  else delete el.dataset.enter
  el.dataset.state = 'shown'
  aim(section)
  shownAt = section
}

watch(current, place, { flush: 'post' })

onMounted(() => {
  place(current.value)
  sizer = new ResizeObserver(() => {
    if (shownAt && mark.value?.dataset.state === 'shown') jump(shownAt)
  })
  sizer.observe(mark.value!)
})

onBeforeUnmount(() => sizer?.disconnect())
</script>

<template>
  <header class="site-header" :class="{ solid }">
    <slot name="lead">
      <NuxtLink to="/" class="name" :class="{ away: !showName }" :data-lagoon-calm="showName ? 'light' : undefined">{{ name }}</NuxtLink>
    </slot>
    <nav aria-label="Main" data-lagoon-calm="light">
      <div class="tabs">
        <ul>
          <li v-for="l in links" :key="l.label">
            <a :href="l.href" :aria-current="l.section && l.section === current ? 'true' : undefined" @click="onNavClick">{{ l.label }}</a>
          </li>
        </ul>
        <ul ref="mark" class="mark" aria-hidden="true" data-state="hidden">
          <li v-for="l in links" :key="l.label">
            <span>{{ l.label }}</span>
          </li>
        </ul>
      </div>
      <button type="button" class="theme" data-theme-toggle @click="toggle">
        <svg class="sunmoon" :class="{ morphing }" viewBox="0 0 20 20" aria-hidden="true">
          <path class="moon" d="M16.2 12.4A6.6 6.6 0 0 1 7.6 3.8a6.6 6.6 0 1 0 8.6 8.6Z" />
          <g class="sun">
            <circle cx="10" cy="10" r="3.4" />
            <path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M4.5 15.5l1.1-1.1M14.4 5.6l1.1-1.1" />
          </g>
          <g class="morph">
            <path ref="disk" />
            <line v-for="i in 8" :key="i" ref="rays" />
          </g>
        </svg>
        <span class="sr-only to-night">Switch to night</span>
        <span class="sr-only to-day">Switch to day</span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px max(20px, env(safe-area-inset-right)) 18px max(20px, env(safe-area-inset-left));
  font-size: 15px;
  color: var(--ink);
}
.site-header::before {
  content: '';
  position: absolute;
  inset: 0 0 -24px;
  z-index: -1;
  background: linear-gradient(var(--paper) 40%, color-mix(in srgb, var(--paper) 0%, transparent));
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  mask-image: linear-gradient(#000 55%, transparent);
  opacity: var(--frost, 0);
  pointer-events: none;
}
.solid::before {
  opacity: 1;
}
@media (prefers-reduced-transparency: reduce) {
  .site-header::before {
    background: var(--paper);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    mask-image: none;
  }
}
.name {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: -0.01em;
  white-space: nowrap;
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out), visibility 0s;
}
.away {
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition-duration: 150ms, 150ms, 0s;
  transition-delay: 0s, 0s, 150ms;
}
@media (prefers-reduced-motion: reduce) {
  .away {
    transform: none;
  }
}
nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tabs {
  position: relative;
}
ul {
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
nav a, .mark span, .theme {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  white-space: nowrap;
}
nav a, .theme {
  position: relative;
  isolation: isolate;
  text-decoration: none;
  color: var(--ink);
  opacity: 0.82;
  transition: opacity 150ms ease, transform 160ms var(--ease-out);
}
/* the hover pill is as tall as the 30 px chip */
nav a::before, .theme::before {
  content: '';
  position: absolute;
  inset: calc(50% - 15px) 0;
  z-index: -1;
  border-radius: 15px;
  transition: background-color 150ms ease;
}
nav a:focus-visible, .theme:focus-visible {
  opacity: 1;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.theme {
  border: 0;
  background: none;
  cursor: pointer;
  font-size: 18px;
}
.theme {
  view-transition-name: theme-toggle;
}
.theme .to-day,
:root.dark .theme .to-night {
  display: none;
}
:root.dark .theme .to-day {
  display: block;
}
.sunmoon {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;
}
.sunmoon .sun,
.sunmoon .morph,
:root.dark .sunmoon .moon {
  display: none;
}
:root.dark .sunmoon .sun {
  display: inline;
}
:root .sunmoon.morphing .moon,
:root .sunmoon.morphing .sun {
  display: none;
}
:root .sunmoon.morphing .morph {
  display: inline;
}
@media (hover: hover) and (pointer: fine) {
  nav a:hover, .theme:hover {
    opacity: 1;
  }
  nav a:hover::before, .theme:hover::before {
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }
}
nav a:active, .theme:active {
  opacity: 1;
  transform: scale(0.97);
}
nav a:active::before, .theme:active::before {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
}
.theme:active {
  transform: scale(0.95);
}
nav a[aria-current]:hover::before, nav a[aria-current]:active::before {
  background: none;
}
nav a:focus-visible {
  position: relative;
  z-index: 1;
}
nav a[aria-current]:focus-visible {
  color: transparent;
  background: none;
}
.mark {
  position: absolute;
  inset: 0;
  background: var(--accent);
  color: var(--on-accent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms var(--ease-out), clip-path 220ms var(--ease-in-out), transform 160ms var(--ease-out);
}
.mark[data-state='shown'] {
  opacity: 1;
  transition: opacity 200ms var(--ease-out), clip-path 220ms var(--ease-in-out), transform 160ms var(--ease-out);
}
.mark[data-enter] {
  transition: opacity 200ms var(--ease-out), clip-path 200ms var(--ease-out), transform 160ms var(--ease-out);
}
.tabs:has(a[aria-current]:active) .mark {
  transform: scale(0.97);
}
.mark.instant {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .mark, .mark[data-state='shown'], .mark[data-enter] {
    transition: opacity 150ms var(--ease-out), transform 160ms var(--ease-out);
  }
}
@media (pointer: coarse) {
  .name, nav a, .mark span, .theme {
    min-height: 44px;
  }
  /* the hit area reaches into the page's edge and the neighbouring link's padding */
  .theme {
    position: relative;
  }
  .theme::after {
    content: '';
    position: absolute;
    inset: 0 -6px 0 -5px;
  }
}
/* measured in Figtree: the header row needs 343 px at 14 px with 7 px item padding, 327 px with 5 px */
@media (max-width: 560px) {
  .site-header {
    gap: 12px;
    font-size: 14px;
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(6px, env(safe-area-inset-right));
  }
  nav, ul {
    gap: 0;
  }
  nav a, .mark span {
    padding: 0 7px;
  }
  .theme {
    padding: 0 8px;
  }
}
@media (max-width: 380px) {
  nav a, .mark span {
    padding: 0 5px;
  }
}
@media (max-width: 340px) {
  .site-header {
    font-size: 13px;
    padding-left: max(12px, env(safe-area-inset-left));
  }
}
</style>
