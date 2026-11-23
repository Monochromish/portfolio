<script setup lang="ts">
import { projects } from '#shared/work'

const EMAIL = 'himanshu.adwani@outlook.com'

const emit = defineEmits<{ again: [e: MouseEvent] }>()
const { alias, name } = useIdentity()

const copied = ref(false)
const status = ref('')
let reset: ReturnType<typeof setTimeout> | undefined

// a plain click copies the address; where copying is blocked the link opens a draft as usual
async function copyEmail(e: MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !navigator.clipboard) return
  e.preventDefault()
  clearTimeout(reset)
  status.value = ''
  try {
    await navigator.clipboard.writeText(EMAIL)
  }
  catch {
    location.href = `mailto:${EMAIL}`
    return
  }
  copied.value = true
  await nextTick()
  status.value = 'Email address copied'
  reset = setTimeout(() => {
    copied.value = false
    status.value = ''
  }, 1600)
}

onBeforeUnmount(() => clearTimeout(reset))
</script>

<template>
  <div class="home-intro" data-wall-clear>
    <div class="who">
      <img class="portrait" data-wall-origin src="/portrait-160.jpg" srcset="/portrait-160.jpg 160w, /portrait-240.jpg 240w" sizes="52px" alt="Portrait of Himanshu Adwani" width="160" height="160" decoding="async" fetchpriority="high">
      <div>
        <h1 class="name">{{ name }}</h1>
        <p class="role">Senior lead developer at Cider</p>
      </div>
    </div>

    <p class="say">
      I build <a class="text-link inline" href="https://cider.sh" rel="noopener">Cider</a>, the Apple&nbsp;Music client for Windows, macOS and Linux,
      <span class="quiet">installed more than 250,000 times.</span><FootnoteMark raised href="#cider-count" @click="emit('again', $event)" />
    </p>
    <p class="lede">
      I’m {{ alias ? 'Himanshu Adwani' : 'Himanshu' }}, though Isaiah is totally fine if that’s easier to say. I study computer science at
      Penn&nbsp;State and graduate in May&nbsp;2028. Great software feels instant and lightweight, qualities that are rare today. I care most about
      the parts you feel: how fast it opens, how it answers a press, how little gets in the way.
    </p>

    <ul class="links">
      <li><a class="button" href="/Himanshu_Adwani_Resume.pdf">Resume</a></li>
      <li>
        <a class="text-link reach swap" :class="{ on: copied }" :href="`mailto:${EMAIL}`" @click="copyEmail">
          <span class="word now">Email</span>
          <span class="word then" aria-hidden="true">Copied</span>
        </a>
      </li>
      <li><a class="text-link reach" href="https://github.com/Monochromish" rel="noopener">GitHub</a></li>
      <li><a class="text-link reach" href="https://www.linkedin.com/in/himanshu-adwani" rel="noopener">LinkedIn</a></li>
    </ul>
    <span class="sr-only" role="status">{{ status }}</span>

    <nav class="index" aria-label="Work">
      <span class="index-label">Work</span>
      <a v-for="p in projects" :key="p.slug" class="jump reach" :href="`#work-${p.slug}`">{{ p.name }}</a>
    </nav>
  </div>
</template>

<style scoped>
.home-intro {
  position: relative;
  width: min(100%, 40rem);
}

.who {
  display: flex;
  align-items: center;
  gap: 14px;
}

.portrait {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  outline: 1px solid var(--line);
  outline-offset: -1px;
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.role {
  margin: 0;
  font-size: var(--t-small);
  line-height: 1.5;
  color: var(--ink-3);
}

.say {
  margin: 26px 0 0;
  font-family: var(--font-display);
  font-size: clamp(27px, 2.1vw + 13px, 44px);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: -0.022em;
  color: var(--ink);
  text-wrap: balance;
}

.inline {
  font-weight: inherit;
}

.quiet {
  color: var(--ink-3);
}

.lede {
  max-width: 34rem;
  margin: 18px 0 0;
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

@media (max-width: 480px) {
  /* keeps the four links on one row on a phone */
  .links {
    column-gap: var(--s4);
  }
}

/* the two labels share one cell, so the link keeps its width when they swap */
.swap {
  display: inline-grid;
}

.word {
  grid-area: 1 / 1;
  transition:
    opacity 180ms ease,
    transform 180ms var(--ease-out),
    filter 180ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .word {
    transition: none;
  }
}

.then,
.swap.on .now {
  opacity: 0;
  filter: blur(3px);
}

.then {
  transform: translateY(6px);
}

.swap.on .now {
  transform: translateY(-6px);
}

.swap.on .then {
  opacity: 1;
  transform: none;
  filter: none;
}

/* the four projects by name, on the first screen */
.index {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s2) 18px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  font-size: var(--t-small);
}

.index-label {
  color: var(--ink-3);
}

.jump {
  position: relative;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .jump:hover {
    text-decoration: underline;
  }
}
</style>
