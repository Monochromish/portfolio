<script setup lang="ts">
const EMAIL = 'himanshu.adwani@outlook.com'
const [mailbox, host] = EMAIL.split('@')

const timeline = [
  { role: 'Senior Lead Developer', org: 'Cider Collective', from: ['2022-11', 'Nov 2022'], to: null, note: null },
  { role: 'Firmware Project Manager', org: 'Nittany Motorsports', from: ['2026-09', 'Sep 2026'], to: null, note: null },
  { role: 'B.S. Computer Science', org: 'Penn State', from: ['2024-08', 'Aug 2024'], to: ['2028-05', 'May 2028'], note: 'Dean’s List, Fall 2024 and Summer 2025' },
]

const { commit } = useRuntimeConfig().public
const RESUME_SOURCE = `https://github.com/Monochromish/portfolio/blob/${commit || 'HEAD'}/resume/Himanshu_Adwani_Resume.tex`

const profiles: { label: string, href: string, icon: string, source?: string }[] = [
  { label: 'Resume', href: '/Himanshu_Adwani_Resume.pdf', icon: 'i-site-file', source: RESUME_SOURCE },
  { label: 'GitHub', href: 'https://github.com/Monochromish', icon: 'i-site-github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/himanshu-adwani', icon: 'i-site-linkedin' },
  { label: 'Handshake', href: 'https://app.joinhandshake.com/profiles/8shxru', icon: 'i-site-handshake' },
]

const address = ref<HTMLElement>()
const copied = ref(false)
const keyed = ref(false)
const status = ref('')
let reset: ReturnType<typeof setTimeout> | undefined

async function copyEmail(e: MouseEvent) {
  clearTimeout(reset)
  keyed.value = e.detail === 0
  status.value = ''
  try {
    await navigator.clipboard.writeText(EMAIL)
    copied.value = true
    await nextTick()
    status.value = 'Email address copied'
  }
  catch {
    if (address.value) getSelection()?.selectAllChildren(address.value)
    await nextTick()
    status.value = 'Could not copy. The address is selected.'
  }
  reset = setTimeout(() => {
    copied.value = false
    status.value = ''
  }, 1600)
}

onBeforeUnmount(() => clearTimeout(reset))
</script>

<template>
  <section id="about" class="section" aria-labelledby="about-title">
    <h2 id="about-title" class="section-title">About</h2>
    <div class="section-body">
      <div class="text">
        <p>I’m Himanshu, though Isaiah is totally fine if that’s easier to say.</p>
        <p>
          I study Computer Science @Penn State, with <a class="link" href="https://cider.sh" rel="noopener">Cider</a> being my
          favorite project to date. I’ve worked with the team since 2022, first as a contributor to the open-source app and
          now as its senior lead developer. I also lead firmware development as a Project Manager for Nittany Motorsports,
          my university’s Formula SAE team.
        </p>
        <p>
          Great software feels instant and lightweight, qualities that are rare today. I design simple yet highly scalable,
          real-time software with zero bloat for the future. If we think alike, <a class="link" :href="`mailto:${EMAIL}`">shoot me an email</a>.
        </p>
      </div>

      <ul class="timeline">
        <li v-for="item in timeline" :key="item.role">
          <p class="what">
            <span class="role">{{ item.role }}</span><span class="org">, {{ item.org }}</span>
          </p>
          <p class="when meta">
            <time :datetime="item.from[0]">{{ item.from[1] }}</time> to
            <time v-if="item.to" :datetime="item.to[0]">{{ item.to[1] }}</time><template v-else>now</template>
          </p>
          <p v-if="item.note" class="note meta">{{ item.note }}</p>
        </li>
      </ul>

      <div class="contact">
        <p class="email">
          <a class="item" :href="`mailto:${EMAIL}`">
            <span class="i-site-mail" aria-hidden="true" />
            <span ref="address">{{ mailbox }}@<wbr>{{ host }}</span>
          </a>
          <button type="button" class="copy" :class="{ copied, keyed }" aria-label="Copy email address" title="Copy address" @click="copyEmail">
            <span class="i-site-copy" aria-hidden="true" />
            <span class="i-site-check" aria-hidden="true" />
          </button>
        </p>
        <ul class="profiles">
          <li v-for="p in profiles" :key="p.label">
            <a class="item" :href="p.href" :rel="p.href.startsWith('http') ? 'noopener' : undefined">
              <span :class="p.icon" aria-hidden="true" />{{ p.label }}
            </a>
            <a v-if="p.source" class="source" :href="p.source" rel="noopener" aria-label="Resume source in LaTeX, on GitHub">LaTeX</a>
          </li>
        </ul>
        <p class="status" aria-live="polite">{{ status }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text p {
  margin: 0;
  line-height: 1.62;
}
.text p + p {
  margin-top: 14px;
}

.timeline {
  margin: 44px 0 0;
  padding: 0;
  list-style: none;
}
.timeline li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 24px;
  padding: 13px 0 14px;
  border-top: 1px solid var(--line);
}
.timeline li:last-child {
  border-bottom: 1px solid var(--line);
}
.what {
  flex: 1 1 17rem;
  margin: 0;
  line-height: 1.5;
}
.role {
  color: var(--ink);
  font-weight: 550;
}
.when {
  flex: none;
  margin: 0;
}
.note {
  flex: 1 0 100%;
  margin: 0;
}

.contact {
  margin: 22px 0 0 -10px;
}
.email {
  display: flex;
  align-items: center;
  margin: 0;
}
.email .item {
  min-width: 0;
}
.copy.keyed > span {
  transition: none;
}
.profiles {
  display: flex;
  flex-wrap: wrap;
  gap: 0 4px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}
@media (max-width: 480px) {
  .profiles {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    column-gap: 16px;
  }
}
.item {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--ink);
  font-weight: 550;
  text-decoration: none;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.item > [class^='i-site'] {
  flex: none;
  font-size: 18px;
  color: var(--ink-3);
}
.profiles li {
  display: flex;
  align-items: center;
}
.source {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  margin-left: -8px;
  padding: 0 10px 0 4px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ink-3);
  text-decoration: none;
  transition: background-color 150ms ease, color 150ms ease, transform 160ms var(--ease-out);
}
.source::before {
  content: '·';
  margin-right: 6px;
}
@media (hover: hover) and (pointer: fine) {
  .source:hover {
    color: var(--ink);
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }
}
.source:active {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
  transform: scale(0.97);
}
.copy {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--ink-3);
  font-size: 18px;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, transform 160ms var(--ease-out);
}
.copy > span {
  grid-area: 1 / 1;
  transition: opacity 160ms var(--ease-out);
}
.copy .i-site-check,
.copy.copied .i-site-copy {
  opacity: 0;
}
.copy.copied {
  color: var(--accent);
}
.copy.copied .i-site-check {
  opacity: 1;
}
@media (pointer: coarse) {
  .item,
  .source {
    min-height: 44px;
  }
  .copy {
    width: 44px;
    height: 44px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .copy > span {
    transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out), filter 160ms var(--ease-out);
  }
  .copy .i-site-check,
  .copy.copied .i-site-copy {
    transform: scale(0.8);
    filter: blur(2px);
  }
  .copy.copied .i-site-check {
    transform: none;
    filter: none;
  }
}
@media (hover: hover) and (pointer: fine) {
  .item:hover,
  .copy:hover {
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }
  .copy:hover {
    color: var(--ink);
  }
  .copy.copied:hover {
    color: var(--accent);
  }
}
.item:active,
.copy:active {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
  transform: scale(0.97);
}
.copy:active {
  transform: scale(0.95);
}
.status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
