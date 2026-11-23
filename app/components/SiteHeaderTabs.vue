<script setup lang="ts">
import { posts } from '#shared/writing'

const route = useRoute()
const error = useError()
const links: { label: string, href: string, section?: string }[] = [
  { label: 'Work', href: '/#work', section: 'work' },
  ...(posts.length ? [{ label: 'Writing', href: '/#writing', section: 'writing' }] : []),
  { label: 'Resume', href: '/Himanshu_Adwani_Resume.pdf' },
]

const current = computed(() => !error.value && /^\/writing(\/|$)/.test(route.path) && links.some(l => l.section === 'writing') ? 'writing' : null)

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
  <div class="site-header-tabs">
    <ul class="list">
      <li v-for="l in links" :key="l.label">
        <a class="nav-chip tab" :href="l.href" :aria-current="l.section && l.section === current ? 'true' : undefined" @click="onNavClick">{{ l.label }}</a>
      </li>
    </ul>
    <ul ref="mark" class="list mark" aria-hidden="true" data-state="hidden">
      <li v-for="l in links" :key="l.label">
        <span class="mark-label">{{ l.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.site-header-tabs {
  position: relative;
}

.list {
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 560px) {
  .list {
    gap: 0;
  }
}

.tab[aria-current]:hover::before,
.tab[aria-current]:active::before {
  background: none;
}

.tab:focus-visible {
  position: relative;
  z-index: 1;
}

.tab[aria-current]:focus-visible {
  color: transparent;
  background: none;
}

.mark {
  position: absolute;
  inset: 0;
  background: var(--ink);
  color: var(--paper);
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 150ms var(--ease-out),
    clip-path 220ms var(--ease-in-out),
    transform 160ms var(--ease-out);
}

.mark[data-state='shown'] {
  opacity: 1;
  transition:
    opacity 200ms var(--ease-out),
    clip-path 220ms var(--ease-in-out),
    transform 160ms var(--ease-out);
}

.mark[data-enter] {
  transition:
    opacity 200ms var(--ease-out),
    clip-path 200ms var(--ease-out),
    transform 160ms var(--ease-out);
}

.site-header-tabs:has(.tab[aria-current]:active) .mark {
  transform: scale(0.97);
}

.mark.instant {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .mark,
  .mark[data-state='shown'],
  .mark[data-enter] {
    transition:
      opacity 150ms var(--ease-out),
      transform 160ms var(--ease-out);
  }
}

.mark-label {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .mark-label {
    min-height: 44px;
  }
}

/* measured in Figtree: the header row needs 343 px at 14 px with 7 px item padding, 327 px with 5 px */
@media (max-width: 560px) {
  .mark-label {
    padding: 0 7px;
  }
}

@media (max-width: 380px) {
  .mark-label {
    padding: 0 5px;
  }
}
</style>
