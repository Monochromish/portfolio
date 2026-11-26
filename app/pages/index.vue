<script setup lang="ts">
import { projects } from '#shared/work'
import type { Project } from '#shared/work'
import type { OwnSticker } from '#shared/types'

// Cider leads with a card of its own; the rest share a row
const [lead, ...rest] = projects as [Project, ...Project[]]

// the one project of the row that is open, across the full row under the cards
const open = ref<string | null>(null)

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
  clearTimeout(uncite)
  window.removeEventListener('hashchange', reveal)
})
</script>

<template>
  <main id="content" class="home">
    <StickerDefs />
    <StickerWall v-slot="{ total }" @placed="onTop = $event">
      <header class="top">
        <HomeIntro @again="again" />

        <p class="left" data-wall-clear>
          <NuxtLink v-if="total" to="/stickers" class="meta count">{{ total }} {{ total === 1 ? 'sticker' : 'stickers' }} left by visitors</NuxtLink>
          <!-- the count arrives after the page, so its space is held from the start and the button beside it never moves -->
          <span v-else class="meta count held" aria-hidden="true">00 stickers left by visitors</span>
          <button type="button" class="button soft leave-one" @pointerenter="reaching = true" @focus="reaching = true" @click="leaveOne">Leave a sticker</button>
        </p>
      </header>
    </StickerWall>

    <div class="column">
      <section id="work" class="block work" aria-labelledby="work-title">
        <h2 id="work-title" class="label heading">Work</h2>
        <HomeWorkLead :project="lead" :cited="cited === lead.footnote?.id" @again="again" />
        <HomeWorkOthers v-model:open="open" :projects="rest" />
      </section>

      <section class="block" aria-labelledby="earlier-title">
        <h2 id="earlier-title" class="label heading">Earlier</h2>
        <HomeEarlier />
      </section>

      <WritingSection />
      <NowSection />
      <LazyGuestbookSection v-if="roomy === false" :asked="asked" :from="from" />
    </div>

    <StickerWall v-if="roomy !== false" class="end" :without="onTop" grow>
      <HomeYours :left="!!own?.left" :reaching="reaching" :asked="asked" :from="from" @reach="reaching = true" @leave="leaveOne" />
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

@media (max-width: 640px) {
  .top {
    justify-items: start;
  }
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

@media (max-width: 640px) {
  .left {
    justify-content: flex-start;
  }
}

.held {
  visibility: hidden;
}

/* set before the first paint for a visitor who already left one, so the count is centred alone from the start */
:global(html.sticker-left .leave-one) {
  display: none;
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

@media (hover: hover) and (pointer: fine) {
  .count:hover {
    text-decoration: underline;
  }
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

@media (max-width: 900px) {
  .block,
  .column :deep(.section) {
    margin-top: 84px;
  }
}

.block.work {
  margin-top: var(--s5);
}

.heading {
  margin-bottom: 20px;
}

/* the wall comes back at the end, with the stickers the top had no room for and a place for one more */
.end {
  --wall-fade: linear-gradient(transparent, #000 30%);
  display: grid;
  place-items: center;
  margin-top: 120px;
  padding: 88px var(--gutter-r) 88px var(--gutter-l);
}

@media (max-width: 900px) {
  /* the board in the column stands in for it */
  .end {
    display: none;
  }
}

.foot {
  padding-bottom: var(--s7);
}

@media (max-width: 900px) {
  .foot {
    margin-top: var(--s7);
  }
}
</style>
