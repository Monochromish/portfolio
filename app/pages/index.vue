<script setup lang="ts">
import { earlier, projects } from '#shared/work'
import type { Project } from '#shared/work'
import type { OwnSticker } from '#shared/types'

const EMAIL = 'himanshu.adwani@outlook.com'

const { alias, name } = useIdentity()

// Cider leads with a card of its own; the rest share a row
const [lead, ...rest] = projects as [Project, ...Project[]]
// its first screenshot is on the card, so the ones under it start from the second
const cover = lead.shots[0]!
const covers = cover.light
  ? [{ file: cover.file, alt: cover.alt, only: 'dark' }, { file: cover.light.file, alt: cover.light.alt, only: 'light' }]
  : [{ file: cover.file, alt: cover.alt, only: null }]
const srcset = (file: string) => cover.widths.map(w => `/work/${file}-${w}.webp ${w}w`).join(', ')

// the one project of the row that is open, across the full row under the cards
const open = ref<string | null>(null)
// projects the visitor has reached for: their screenshots load before the project opens
const reached = reactive(new Set<string>())

const older = [...earlier].sort((a, b) => Number(b.year) - Number(a.year))

// the pad opens over the page, growing out of whichever button asked for it
const { data: own } = useNuxtData<OwnSticker>('guestbook-mine')
// the pad and the board load when a visitor reaches for the button, so the page does not wait on their code and styles
const reaching = ref(false)
const asked = ref(0)
const from = shallowRef<DOMRect>()
function leaveOne(e: MouseEvent) {
  from.value = (e.currentTarget as HTMLElement).getBoundingClientRect()
  reaching.value = true
  asked.value++
}
// a narrow screen has a board of stickers at the end in place of the two walls of them
const roomy = useRoomy()
// the stickers the wall at the top had room for; the rest go up around the slot at the end
const onTop = ref<number[]>([])

useHead({
  link: [{ rel: 'preload', href: '/fonts/funnel-display.woff2', as: 'font', type: 'font/woff2', crossorigin: '' }],
})

// the footnote a link has just pointed at
const cited = ref('')
let uncite: ReturnType<typeof setTimeout> | undefined

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

// a link to a closed project, or into one such as the installs footnote, opens it first
async function reveal() {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
  if (!target) return
  const slug = target.dataset.project
  if (slug) {
    open.value = slug
    return
  }
  const closed = target.closest('details:not([open])') ?? document.querySelector(`details[data-for="${target.id}"]:not([open])`)
  if (closed instanceof HTMLDetailsElement) closed.open = true
  if (!target.classList.contains('small')) return
  // a footnote is small grey text: it comes to the middle of the screen and is marked for a moment, so the eye lands on it
  await nextTick()
  target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  cited.value = target.id
  clearTimeout(uncite)
  uncite = setTimeout(() => {
    cited.value = ''
  }, 2400)
}

// a second press on a link the address already points at changes nothing in the address, so it is answered here
function again(e: MouseEvent) {
  if (location.hash === (e.currentTarget as HTMLAnchorElement).hash) reveal()
}

onMounted(() => {
  reveal()
  window.addEventListener('hashchange', reveal)
})

onBeforeUnmount(() => {
  clearTimeout(reset)
  clearTimeout(uncite)
  window.removeEventListener('hashchange', reveal)
})
</script>

<template>
  <main id="content" class="home">
    <StickerDefs />
    <StickerWall v-slot="{ total }" @placed="onTop = $event">
      <header class="top">
        <div class="intro" data-wall-clear>
          <div class="who">
            <img class="portrait" data-wall-origin src="/portrait-160.jpg" srcset="/portrait-160.jpg 160w, /portrait-240.jpg 240w" sizes="52px" alt="Portrait of Himanshu Adwani" width="160" height="160" decoding="async" fetchpriority="high">
            <div>
              <h1 class="name">{{ name }}</h1>
              <p class="role">Senior lead developer at Cider</p>
            </div>
          </div>

          <p class="say">
            I build <a class="text-link" href="https://cider.sh" rel="noopener">Cider</a>, the Apple&nbsp;Music client for Windows, macOS and Linux,
            <span class="quiet">installed more than 250,000 times.</span><a class="mark" href="#cider-count" aria-label="How this is counted" @click="again">*</a>
          </p>
          <p class="lede">
            I’m {{ alias ? 'Himanshu Adwani' : 'Himanshu' }}, though Isaiah is totally fine if that’s easier to say. I study computer science at
            Penn&nbsp;State and graduate in May&nbsp;2028. Great software feels instant and lightweight, qualities that are rare today. I care most about
            the parts you feel: how fast it opens, how it answers a press, how little gets in the way.
          </p>

          <ul class="links">
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

          <nav class="index" aria-label="Work">
            <span>Work</span>
            <a v-for="p in projects" :key="p.slug" :href="`#work-${p.slug}`">{{ p.name }}</a>
          </nav>
        </div>

        <p class="left" data-wall-clear>
          <NuxtLink v-if="total" to="/stickers" class="meta count">{{ total }} {{ total === 1 ? 'sticker' : 'stickers' }} left by visitors</NuxtLink>
          <button v-if="!own?.left" type="button" class="button soft" @pointerenter="reaching = true" @focus="reaching = true" @click="leaveOne">Leave a sticker</button>
        </p>
      </header>
    </StickerWall>

    <div class="column">
      <section id="work" class="block" aria-labelledby="work-title">
        <h2 id="work-title" class="label">Work</h2>

        <article :id="`work-${lead.slug}`" class="feature" :style="{ '--field': lead.field, '--glow': lead.glow ?? lead.field, '--on': lead.ink }">
          <div class="text">
            <h3>{{ lead.name }}</h3>
            <p class="what">{{ lead.brief }} · {{ lead.period }}</p>
            <p class="summary">{{ lead.summary }}</p>
            <p v-if="lead.links.length" class="facts">
              <a v-for="l in lead.links" :key="l.href" class="text-link" :href="l.href" rel="noopener">{{ l.label }}</a>
            </p>
            <p v-for="s in lead.stats" :key="s.label" class="stat">
              <strong>{{ s.value }}</strong>
              <span>{{ s.label }}<a v-if="s.note" class="mark" :href="`#${s.note}`" aria-label="How this is counted" @click="again">*</a></span>
            </p>
          </div>
          <div class="cover">
            <img
              v-for="pic in covers"
              :key="pic.file"
              :class="pic.only && `only-${pic.only}`"
              :src="`/work/${pic.file}-${cover.widths[0]}.webp`"
              :srcset="srcset(pic.file)"
              sizes="(max-width: 900px) 100vw, 780px"
              :width="cover.width"
              :height="cover.height"
              :alt="pic.alt"
              loading="lazy"
              decoding="async"
            >
          </div>
        </article>
        <details class="deep" :data-for="`work-${lead.slug}`" @pointerenter="reached.add(lead.slug)" @focusin="reached.add(lead.slug)" @touchstart.passive="reached.add(lead.slug)">
          <summary>What I built there<span class="plus" aria-hidden="true" /></summary>
          <div class="more">
            <ul class="points">
              <li v-for="point in lead.points" :key="point">{{ point }}</li>
            </ul>
            <ShotStrip v-if="lead.shots.length > 1" :shots="lead.shots.slice(1)" :label="`More screenshots of ${lead.name}`" :eager="reached.has(lead.slug)" />
            <p v-if="lead.footnote" :id="lead.footnote.id" class="small wide" :class="{ cited: cited === lead.footnote.id }">
              * {{ lead.footnote.text }}<template v-if="lead.footnote.link">{{ ' ' }}<a class="text-link" :href="lead.footnote.link.href" rel="noopener">{{ lead.footnote.link.label }}</a>.</template>
            </p>
          </div>
        </details>

        <div class="others">
          <template v-for="p in rest" :key="p.slug">
            <article
              :id="`work-${p.slug}`"
              class="other"
              :class="{ on: open === p.slug }"
              :data-project="p.slug"
              @pointerenter="reached.add(p.slug)"
              @focusin="reached.add(p.slug)"
              @touchstart.passive="reached.add(p.slug)"
            >
              <h3>{{ p.name }}</h3>
              <p class="what">{{ p.brief }}</p>
              <p class="when">{{ p.period }}</p>
              <p class="summary">{{ p.summary }}</p>
              <p v-if="p.links.length" class="facts">
                <a v-for="l in p.links" :key="l.href" class="text-link" :href="l.href" rel="noopener">{{ l.label }}</a>
              </p>
              <button class="opens" type="button" :aria-expanded="open === p.slug" :aria-controls="`more-${p.slug}`" @click="open = open === p.slug ? null : p.slug">
                More<span class="plus" aria-hidden="true" />
              </button>
            </article>
            <div v-show="open === p.slug" :id="`more-${p.slug}`" class="panel" role="region" :aria-label="`More about ${p.name}`">
              <h4>{{ p.name }}</h4>
              <div class="more" :class="{ solo: !p.shots.length }">
                <ul class="points">
                  <li v-for="point in p.points" :key="point">{{ point }}</li>
                </ul>
                <ShotStrip v-if="p.shots.length" :shots="p.shots" :label="`Screenshots of ${p.name}`" :eager="reached.has(p.slug)" :tall="p.shots.every(s => s.height > s.width)" />
                <p v-if="p.note" class="small wide">{{ p.note }}</p>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section class="block" aria-labelledby="earlier-title">
        <h2 id="earlier-title" class="label">Earlier</h2>
        <div class="earlier">
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
      </section>

      <WritingSection />
      <NowSection />
      <LazyGuestbookSection v-if="roomy === false" :asked="asked" :from="from" />
    </div>

    <StickerWall v-if="roomy !== false" class="end" :without="onTop" grow>
      <div class="yours" data-wall-clear data-wall-origin>
        <button v-if="!own?.left" type="button" class="ask" @pointerenter="reaching = true" @focus="reaching = true" @click="leaveOne">
          <span class="slot">Yours goes here</span>
          <span class="button soft">Leave a sticker</span>
        </button>
        <!-- one place for the pad whether or not a sticker has been left, so it is never rebuilt part way through leaving one -->
        <div :class="own?.left ? 'slot taken' : 'waiting'">
          <LazyGuestbookSection v-if="reaching || own?.left" overlay :asked="asked" :from="from" />
        </div>
      </div>
    </StickerWall>
    <div class="column foot">
      <SiteFooter />
    </div>
  </main>
</template>

<style scoped>
.home {
  --gutter-l: max(var(--s5), env(safe-area-inset-left));
  --gutter-r: max(var(--s5), env(safe-area-inset-right));
  overflow-x: clip;
}

/* the wall is only as tall as its words, so the work starts on the first screen */
.top {
  display: grid;
  justify-items: center;
  gap: var(--s7);
  padding: 92px var(--gutter-r) var(--s7) var(--gutter-l);
}
.intro {
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
}
.role {
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
.say .text-link {
  font-weight: inherit;
}
.quiet {
  color: var(--ink-3);
}
.mark {
  position: relative;
  margin-left: 0.08em;
  font-family: 'Figtree', 'Figtree Fallback', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0;
  vertical-align: 0.25em;
  color: var(--ink-3);
  text-decoration: none;
}
.say .mark {
  vertical-align: 1em;
}
/* a 44 px target around a small mark */
.mark::after {
  content: '';
  position: absolute;
  inset: -16px -14px;
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
/* a 44 px tall target for each short link */
.links .text-link::after,
.facts .text-link::after,
.small .text-link::after,
.index a::after {
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
.index > span {
  color: var(--ink-3);
}
.index a {
  position: relative;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
}
.count {
  position: relative;
  text-decoration: none;
}
/* a 44 px tall target */
.count::after {
  content: '';
  position: absolute;
  inset: -12px -6px;
}
.left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--s2) var(--s4);
  min-height: 44px;
  margin: 0;
}

.column {
  box-sizing: border-box;
  width: 100%;
  max-width: calc(67.5rem + var(--gutter-l) + var(--gutter-r));
  margin: 0 auto;
  padding: 0 var(--gutter-r) 0 var(--gutter-l);
}
.block,
.column :deep(.section) {
  max-width: none;
  margin: 104px 0 0;
  padding: 0;
}
#work {
  margin-top: var(--s5);
}
.block > .label {
  margin-bottom: 20px;
}

.feature {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 40px;
  min-height: 430px;
  padding: 44px 0 0 44px;
  overflow: clip;
  border-radius: 28px 28px 0 0;
  background: radial-gradient(120% 90% at 85% 110%, var(--glow) 0%, transparent 60%), var(--field);
  box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.22), inset 0 0 0 1px rgb(255 255 255 / 0.08);
  color: var(--on);
  scroll-margin-top: var(--s5);
}
.feature .text {
  display: flex;
  flex-direction: column;
  padding-bottom: 40px;
}
.feature :is(h3, p) {
  margin: 0;
  color: inherit;
}
.feature h3 {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.feature .what {
  margin-top: 6px;
  font-size: var(--t-small);
  opacity: 0.9;
}
.feature .summary {
  margin-top: 20px;
}
.feature .facts {
  margin-top: 14px;
}
.feature .text-link {
  color: inherit;
  text-decoration-color: color-mix(in srgb, currentColor 50%, transparent);
}
.feature .stat {
  margin-top: auto;
  padding-top: 28px;
}
.stat strong {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(40px, 4vw, 56px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}
.stat span {
  display: block;
  margin-top: var(--s2);
  font-size: var(--t-small);
  opacity: 0.9;
}
.stat .mark {
  color: inherit;
}
.cover {
  align-self: end;
  margin-top: var(--s3);
}
/* runs off the card's right edge; never wider than the file */
.cover img {
  display: block;
  width: 132%;
  max-width: none;
  height: auto;
  border-top-left-radius: 14px;
  box-shadow: 0 30px 60px -20px color-mix(in srgb, var(--field) 35%, #000), 0 0 0 1px rgb(255 255 255 / 0.14);
}
.cover .only-dark,
:root.dark .cover .only-light {
  display: none;
}
:root.dark .cover .only-dark {
  display: block;
}

.deep,
.other,
.panel {
  background: var(--surface);
  box-shadow: var(--edge);
}
.deep {
  border-radius: 0 0 28px 28px;
}
.deep > summary,
.opens {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s4);
  min-height: 44px;
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}
.deep > summary {
  padding: var(--s2) 28px var(--s2) 44px;
  border-radius: 0 0 28px 28px;
  list-style: none;
}
.deep > summary::-webkit-details-marker {
  display: none;
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
.deep[open] .plus::after,
.opens[aria-expanded='true'] .plus::after {
  transform: rotate(0);
}
.deep::details-content {
  block-size: 0;
  overflow: clip;
  transition: block-size 190ms var(--ease-out), content-visibility 190ms allow-discrete;
}
.deep[open]::details-content {
  block-size: auto;
  transition-duration: 240ms;
}
/* what was done on the left, what it looks like on the right */
.more {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: var(--s5) 40px;
}
.more.solo {
  grid-template-columns: minmax(0, 42rem);
}
.deep .more {
  padding: var(--s2) 44px 36px;
}
.more > * {
  margin: 0;
  min-width: 0;
}
.wide {
  grid-column: 1 / -1;
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
}
.small {
  scroll-margin-top: var(--s7);
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-3);
}
/* the mark reaches a little past the text, and goes as slowly as it came quickly */
.small[id] {
  margin: calc(var(--s2) * -1) calc(var(--s3) * -1);
  padding: var(--s2) var(--s3);
  border-radius: var(--r1);
  transition: background-color 900ms ease, color 900ms ease;
}
.cited {
  background: var(--fill-hover);
  color: var(--ink);
  transition-duration: 150ms;
}

/* three cards of one height; the one that opens does so across the row under them */
.others {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s4);
  margin-top: var(--s4);
}
.other {
  display: flex;
  flex-direction: column;
  padding: 26px 26px var(--s2);
  border-radius: 22px;
  scroll-margin-top: var(--s5);
  transition: opacity 180ms ease, box-shadow 150ms ease;
}
.other.on {
  box-shadow: var(--edge-lift);
}
.other :is(h3, p) {
  margin: 0;
}
.other h3 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.other .what,
.other .when {
  font-size: var(--t-small);
  line-height: 1.45;
  color: var(--ink-3);
}
.other .what {
  margin-top: 2px;
}
.other .when {
  margin-top: 6px;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}
.other .summary {
  margin-top: var(--s4);
  font-size: var(--t-small);
}
.other .facts {
  margin-top: var(--s3);
}
/* on the card's floor, so the three end on one line */
.opens {
  width: 100%;
  margin-top: auto;
  border-top: 1px solid var(--line);
}
.other > :nth-last-child(2) {
  margin-bottom: 18px;
}
.panel {
  grid-column: 1 / -1;
  order: 1;
  padding: 30px 26px 32px;
  border-radius: 22px;
  animation: unfold 240ms var(--ease-out);
}
.panel h4 {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}
@keyframes unfold {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}

.earlier {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--s7);
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

/* the wall comes back at the end, with the stickers the top had no room for and a place for one more */
.end {
  --wall-fade: linear-gradient(transparent, #000 30%);
  display: grid;
  place-items: center;
  margin-top: 120px;
  padding: 88px var(--gutter-r) 88px var(--gutter-l);
}
/* as tall with a sticker left as without, so leaving one does not shrink the page under the visitor */
.yours {
  display: grid;
  align-content: start;
  justify-items: center;
  min-height: calc(min(78vw, 330px) * 214 / 288 + 30px + 44px);
}
/* the slot once it is taken: a solid edge, and the thanks where the invitation was */
.slot.taken {
  padding: 0 var(--s5);
  border-style: solid;
  border-color: var(--line-strong);
  font-family: inherit;
  letter-spacing: 0;
}
.waiting {
  position: absolute;
}
.ask {
  display: grid;
  justify-items: center;
  gap: 30px;
  border-radius: 26px;
  cursor: pointer;
}
.foot {
  padding-bottom: var(--s7);
}
.slot {
  display: grid;
  place-items: center;
  width: min(78vw, 330px);
  aspect-ratio: 288 / 214;
  border: 1.5px dashed color-mix(in srgb, var(--ink) 40%, transparent);
  border-radius: 26px;
  rotate: -4deg;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--ink-3);
  transition: rotate 260ms var(--ease-out), border-color 150ms ease, color 150ms ease, background-color 150ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .index a:hover,
  .count:hover {
    text-decoration: underline;
  }
  .others:has(.other:hover) .other:not(:hover, .on),
  .earlier:hover .row:not(:hover) {
    opacity: 0.55;
  }
  .other:hover {
    box-shadow: var(--edge-lift);
  }
  .ask:hover .slot {
    rotate: -1.5deg;
    border-color: var(--ink-3);
    background: var(--fill);
    color: var(--ink);
  }
  .ask:hover .button {
    background: var(--fill-hover);
    box-shadow: var(--edge-lift);
  }
}
@media (max-width: 900px) {
  .feature {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s2);
    min-height: 0;
    padding: var(--s6) 0 0 28px;
  }
  .feature .text {
    padding: 0 28px var(--s2) 0;
  }
  .cover img {
    width: 118%;
  }
  .deep > summary {
    padding: var(--s2) var(--s5) var(--s2) 28px;
  }
  .deep .more {
    padding: var(--s2) 28px 28px;
  }
  .more,
  .others,
  .earlier {
    grid-template-columns: minmax(0, 1fr);
  }
  /* the board in the column stands in for it */
  .end {
    display: none;
  }
  .foot {
    margin-top: var(--s7);
  }
  /* each opens right under its own card */
  .panel {
    order: 0;
    padding: 26px;
  }
  .block,
  .column :deep(.section) {
    margin-top: 84px;
  }
  #work {
    margin-top: var(--s5);
  }
}
@media (max-width: 640px) {
  .top {
    justify-items: start;
  }
  .left {
    justify-content: flex-start;
  }
  .row {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--s1);
  }
}
@media (max-width: 480px) {
  /* keeps the four links on one row on a phone */
  .links {
    column-gap: var(--s4);
  }
}
@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }
  .swap > span,
  .plus::before,
  .plus::after,
  .slot,
  .small[id],
  .deep::details-content {
    transition: none;
  }
}
</style>
