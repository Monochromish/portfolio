<script setup lang="ts">
import { earlier, projects } from '#shared/work'

const EMAIL = 'himanshu.adwani@outlook.com'

const { alias, name } = useIdentity()

const host = ref<HTMLElement>()
const field = ref<HTMLCanvasElement>()
const box = ref<HTMLElement>()
const { paused, reduced, toggle } = useContourField({ host, field, box })

// rows the visitor has reached for: their screenshots load before the row opens
const reached = reactive(new Set<string>())

const older = [...earlier].sort((a, b) => Number(b.year) - Number(a.year))

useHead({
  link: [{ rel: 'preload', href: '/fonts/funnel-display.woff2', as: 'font', type: 'font/woff2', crossorigin: '' }],
})

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

// a link into a closed project, such as the users footnote, opens it first
function reveal() {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  const project = target?.closest('details')
  if (!target || !project || project.open) return
  project.open = true
  target.scrollIntoView()
}

onMounted(() => {
  reveal()
  window.addEventListener('hashchange', reveal)
})

onBeforeUnmount(() => {
  clearTimeout(reset)
  window.removeEventListener('hashchange', reveal)
})
</script>

<template>
  <div ref="host" class="home">
    <canvas ref="field" class="field" aria-hidden="true" />

    <main id="content" class="column">
      <header>
        <component
          :is="reduced ? 'div' : 'button'"
          ref="box"
          class="portrait rise"
          v-bind="reduced ? {} : { 'type': 'button', 'aria-pressed': paused, 'title': paused ? 'Play the contours' : 'Pause the contours', 'onClick': toggle }"
        >
          <img src="/portrait.jpg" alt="Portrait of Himanshu Adwani" width="460" height="460" decoding="async" fetchpriority="high">
          <span v-if="!reduced" class="sr-only">Pause the contours around it</span>
        </component>
        <div class="who rise" data-field-calm>
          <h1 class="name">{{ name }}</h1>
          <p class="role">Senior lead developer at Cider</p>
        </div>

        <div class="about rise" data-field-calm>
          <p class="first">
            I build <a class="text-link" href="https://cider.sh" rel="noopener">Cider</a>, the Apple&nbsp;Music client for Windows, macOS and Linux that close to a
            million people use.<a class="mark" href="#cider-count" aria-label="How this is estimated">*</a> I study computer science at Penn&nbsp;State and
            graduate in May&nbsp;2028.
          </p>
          <p>
            I’m {{ alias ? 'Himanshu Adwani' : 'Himanshu' }}, though Isaiah is totally fine if that’s easier to say. Great software feels instant and
            lightweight, qualities that are rare today. I design simple yet highly scalable, real-time software with zero bloat for the future.
          </p>
        </div>

        <ul class="links rise" data-field-calm>
          <li><a class="button" href="/Himanshu_Adwani_Resume.pdf">Resume</a></li>
          <li>
            <a class="text-link swap" :class="{ on: copied }" :href="`mailto:${EMAIL}`" @click="copyEmail">
              <span>Email</span>
              <span aria-hidden="true">Copied</span>
            </a>
          </li>
          <li><a class="text-link" href="https://github.com/Monochromish" rel="noopener">GitHub</a></li>
          <li><a class="text-link" href="https://www.linkedin.com/in/himanshu-adwani" rel="noopener">LinkedIn</a></li>
        </ul>
        <span class="sr-only" role="status">{{ status }}</span>
      </header>

      <section id="work" class="block" aria-labelledby="work-title">
        <h2 id="work-title" class="label">Work</h2>
        <details v-for="p in projects" :id="`work-${p.slug}`" :key="p.slug" class="project">
          <summary class="row" @pointerenter="reached.add(p.slug)" @focus="reached.add(p.slug)" @touchstart.passive="reached.add(p.slug)">
            <span>
              <span class="row-name">{{ p.name }}</span>
              <span class="row-what">{{ p.brief }}</span>
            </span>
            <span class="row-when opens">{{ p.period }}<span class="plus" aria-hidden="true" /></span>
          </summary>
          <div class="more">
            <p>{{ p.summary }}</p>
            <p v-if="p.stats?.length || p.links.length" class="facts">
              <span v-for="s in p.stats" :key="s.label">
                <strong>{{ s.value }}</strong> {{ s.label }}<a v-if="s.note" class="mark" :href="`#${s.note}`" aria-label="How this is estimated">*</a>
              </span>
              <a v-for="l in p.links" :key="l.href" class="text-link" :href="l.href" rel="noopener">{{ l.label }}</a>
            </p>
            <ShotStrip v-if="p.shots.length" :shots="p.shots" :label="`Screenshots of ${p.name}`" :eager="reached.has(p.slug)" />
            <ul v-if="p.points.length" class="points">
              <li v-for="point in p.points" :key="point">{{ point }}</li>
            </ul>
            <p v-if="p.footnote" :id="p.footnote.id" class="small">
              * {{ p.footnote.text }}<template v-if="p.footnote.link">{{ ' ' }}<a class="text-link" :href="p.footnote.link.href" rel="noopener">{{ p.footnote.link.label }}</a>.</template>
            </p>
            <p v-if="p.note" class="small">{{ p.note }}</p>
          </div>
        </details>
      </section>

      <section class="block" aria-labelledby="earlier-title">
        <h2 id="earlier-title" class="label">Earlier</h2>
        <a v-for="e in older" :key="e.href" class="row" :href="e.href" rel="noopener">
          <span>
            <span class="row-name">{{ e.name }}</span>
            <span class="row-what">{{ e.note }}</span>
          </span>
          <span class="row-when">
            <span v-if="e.stars != null" class="stars">{{ e.stars.toLocaleString('en-US') }} stars</span><time :datetime="e.year">{{ e.year }}</time>
          </span>
        </a>
      </section>

      <WritingSection />
      <NowSection />
      <GuestbookSection />

      <div class="end">
        <SiteFooter />
      </div>
    </main>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  overflow-x: clip;
}
/* sized and placed by the script */
.field {
  position: absolute;
  pointer-events: none;
}

.column {
  position: relative;
  max-width: 40rem;
  margin: 0 auto;
  padding: var(--s9) max(var(--s5), env(safe-area-inset-right)) var(--s7) max(var(--s5), env(safe-area-inset-left));
  line-height: 1.65;
}
.block,
.column :deep(.section) {
  max-width: none;
  margin: var(--s8) 0 0;
  padding: 0;
}
.end {
  margin-top: var(--s7);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
.rise {
  animation: rise 300ms var(--ease-out) both;
}
.who.rise {
  animation-delay: 50ms;
}
.about.rise {
  animation-delay: 100ms;
}
.links.rise {
  animation-delay: 150ms;
}

.portrait {
  position: relative;
  display: block;
  width: 80px;
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
}
button.portrait {
  cursor: pointer;
  transition: transform 160ms var(--ease-out);
}
button.portrait:active {
  transform: scale(0.97);
}
.portrait img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  outline: 1px solid var(--line);
  outline-offset: -1px;
}

.who {
  margin-top: var(--s4);
}
.name,
.role {
  margin: 0;
}
.name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.role {
  font-size: var(--t-small);
  line-height: 1.5;
  color: var(--ink-3);
}
.about {
  margin-top: var(--s6);
}
/* running text stops at about 68 characters a line; rows and lists keep the full column */
.about p,
.more > p:not(.facts),
.points {
  max-width: 31rem;
}
.about p {
  margin: 0;
}
.about p + p {
  margin-top: var(--s4);
}
.first {
  color: var(--ink);
}
.mark {
  position: relative;
  margin-left: 0.08em;
  font-size: 0.9em;
  vertical-align: 0.25em;
  color: var(--ink-3);
  text-decoration: none;
}
/* a 44 px target around a small mark */
.mark::after {
  content: '';
  position: absolute;
  inset: -16px -14px;
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
/* a 44 px tall target for each short link */
.links .text-link::after {
  content: '';
  position: absolute;
  inset: -10px -6px;
}
/* the two labels share one cell, so the link keeps its width when they swap */
.swap {
  display: inline-grid;
}
.swap > span {
  grid-area: 1 / 1;
  transition: opacity 180ms ease, transform 180ms var(--ease-out), filter 180ms ease;
}
.swap > span + span,
.swap.on > span:first-child {
  opacity: 0;
  filter: blur(3px);
}
.swap > span + span {
  transform: translateY(6px);
}
.swap.on > span:first-child {
  transform: translateY(-6px);
}
.swap.on > span + span {
  opacity: 1;
  transform: none;
  filter: none;
}

/* the hover chip reaches 12 px past the text, so the text stays on the column's edges */
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: var(--s4);
  margin: 0 calc(var(--s3) * -1);
  padding: 10px var(--s3);
  border-radius: var(--r2);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.row-name,
.row-what {
  display: block;
}
.row-name {
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}
.row-what {
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

.project {
  scroll-margin-top: var(--s5);
}
.project > summary {
  list-style: none;
}
.project > summary::-webkit-details-marker {
  display: none;
}
.opens {
  display: inline-flex;
  align-items: center;
  gap: var(--s3);
}
.plus {
  position: relative;
  flex: none;
  width: 11px;
  height: 11px;
}
.plus::before,
.plus::after {
  content: '';
  position: absolute;
  inset: 5px 0;
  border-radius: 1px;
  background: currentColor;
  transition: transform 220ms var(--ease-out);
}
.plus::after {
  transform: rotate(90deg);
}
.project[open] .plus::after {
  transform: rotate(0);
}
.project::details-content {
  block-size: 0;
  overflow: clip;
  transition: block-size 190ms var(--ease-out), content-visibility 190ms allow-discrete;
}
.project[open]::details-content {
  block-size: auto;
  transition-duration: 240ms;
}
.more {
  opacity: 0;
  transition: opacity 120ms ease;
}
.project[open] .more {
  opacity: 1;
  transition: opacity 200ms ease 40ms;
}
@starting-style {
  .project[open] .more {
    opacity: 0;
  }
}
.more {
  padding: var(--s2) 0 var(--s5);
}
.more > * {
  margin: 0;
}
.more > * + * {
  margin-top: var(--s4);
}
.points {
  padding: 0;
  list-style: none;
}
.points li {
  position: relative;
  padding-left: var(--s4);
  font-size: 15px;
  line-height: 1.6;
}
.points li + li {
  margin-top: var(--s2);
}
.points li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.75em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ink-3);
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s1) var(--s5);
  font-size: var(--t-small);
  font-variant-numeric: tabular-nums;
}
.facts strong {
  font-weight: 600;
  color: var(--ink);
}
.small {
  /* smaller type, so a narrower block for the same 70 or so characters */
  max-width: 28rem;
  scroll-margin-top: var(--s7);
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-3);
}

@media (hover: hover) and (pointer: fine) {
  .row:hover {
    background: var(--fill);
  }
}
.row:active {
  background: var(--fill-hover);
}
@media (max-width: 480px) {
  .column {
    padding-top: var(--s8);
  }
  /* keeps the four links on one row on a phone */
  .links {
    column-gap: var(--s4);
  }
  .row-when {
    font-size: 13.5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rise {
    animation: none;
  }
  .swap > span,
  .plus::before,
  .plus::after,
  .more,
  .project[open] .more,
  .project::details-content {
    transition: none;
  }
}
</style>
