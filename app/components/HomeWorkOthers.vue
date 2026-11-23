<script setup lang="ts">
import type { Project } from '#shared/work'

defineProps<{ projects: Project[] }>()
// the one project of the row that is open, across the full row under the cards
const open = defineModel<string | null>('open', { required: true })

// where each card sits in its row, so its panel can grow out from under it and fold back into it
const grown = reactive<Record<string, { left: number, right: number }>>({})
function toggle(slug: string, e: MouseEvent) {
  const card = (e.currentTarget as HTMLElement).closest('.other')
  const row = card?.parentElement
  if (card && row) {
    const c = card.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    grown[slug] = { left: c.left - r.left, right: r.right - c.right }
  }
  open.value = open.value === slug ? null : slug
}
// projects the visitor has reached for: their screenshots load before the project opens
const reached = reactive(new Set<string>())
</script>

<template>
  <div class="home-work-others">
    <template v-for="p in projects" :key="p.slug">
      <article
        :id="`work-${p.slug}`"
        class="other"
        :class="{ on: open === p.slug }"
        :data-project="p.slug"
        @pointerenter="reached.add(p.slug)"
        @focusin="reached.add(p.slug)"
        @touchstart.passive="reached.add(p.slug)"
      >
        <h3 class="name">{{ p.name }}</h3>
        <p class="what">{{ p.brief }}</p>
        <p class="when">{{ p.period }}</p>
        <p class="summary" :class="{ last: !p.links.length }">{{ p.summary }}</p>
        <p v-if="p.links.length" class="facts">
          <a v-for="l in p.links" :key="l.href" class="text-link reach" :href="l.href" rel="noopener">{{ l.label }}</a>
        </p>
        <HomeWorkToggle tag="button" class="opens" type="button" :aria-expanded="open === p.slug" :aria-controls="`more-${p.slug}`" @click="toggle(p.slug, $event)">
          More
        </HomeWorkToggle>
      </article>
      <Transition name="grow">
        <div v-show="open === p.slug" :id="`more-${p.slug}`" class="panel" role="region" :aria-label="`More about ${p.name}`" :style="{ '--from-l': `${grown[p.slug]?.left ?? 0}px`, '--from-r': `${grown[p.slug]?.right ?? 0}px` }">
          <h4 class="title">{{ p.name }}</h4>
          <HomeWorkMore
            class="body"
            :points="p.points"
            :shots="p.shots"
            :label="`Screenshots of ${p.name}`"
            :eager="reached.has(p.slug)"
            :tall="p.shots.every(s => s.height > s.width)"
            :note="p.note"
          />
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* three cards of one height; the one that opens does so across the row under them */
.home-work-others {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s4);
  margin-top: var(--s4);
}

@media (max-width: 900px) {
  .home-work-others {
    grid-template-columns: minmax(0, 1fr);
  }
}

.other {
  --limn-edge: var(--edge);
  display: flex;
  flex-direction: column;
  padding: 26px 26px var(--s2);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--limn-edge);
  scroll-margin-top: var(--s5);
  transition:
    opacity 180ms ease,
    box-shadow 150ms ease;
}

.other.on {
  --limn-edge: var(--edge-lift);
}

@media (hover: hover) and (pointer: fine) {
  .home-work-others:has(.other:hover) .other:not(:hover, .on) {
    opacity: 0.55;
  }

  .other:hover {
    --limn-edge: var(--edge-lift);
  }
}

.name,
.what,
.when,
.summary,
.facts {
  margin: 0;
}

.name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.what,
.when {
  font-size: var(--t-small);
  line-height: 1.45;
  color: var(--ink-3);
}

.what {
  margin-top: 2px;
}

.when {
  margin-top: 6px;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}

.summary {
  margin-top: var(--s4);
  font-size: var(--t-small);
}

.summary.last {
  margin-bottom: 18px;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s1) var(--s5);
  margin-top: var(--s3);
  margin-bottom: 18px;
  font-size: var(--t-small);
}

/* on the card's floor, so the three end on one line */
.opens {
  width: 100%;
  margin-top: auto;
  border-top: 1px solid var(--line);
}

.panel {
  grid-column: 1 / -1;
  order: 1;
  padding: 30px 26px 32px;
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--edge);
}

@media (max-width: 900px) {
  /* each opens right under its own card */
  .panel {
    order: 0;
    padding: 26px;
  }
}

.title {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}

/* it starts as wide as its card and no taller than the card's lower edge, then opens down and out to the full row */
@keyframes unfold {
  from {
    clip-path: inset(0 var(--from-r, 0px) 100% var(--from-l, 0px) round 22px);
  }

  to {
    clip-path: inset(0 0 0 0 round 22px);
  }
}

@keyframes fold {
  from {
    clip-path: inset(0 0 0 0 round 22px);
  }

  to {
    block-size: 0;
    margin-bottom: calc(var(--s4) * -1);
    padding-block: 0;
    clip-path: inset(0 var(--from-r, 0px) 100% var(--from-l, 0px) round 22px);
  }
}

@keyframes arrive {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.grow-enter-active {
  animation: unfold 460ms var(--ease-out);
}

.grow-enter-active .title,
.grow-enter-active .body {
  animation: arrive 320ms 140ms var(--ease-out) backwards;
}

/* closing is the same motion back: the words go first, then it folds up into its card and the page closes over it */
.grow-leave-active {
  overflow: clip;
  animation: fold 340ms var(--ease-in-out) forwards;
}

.grow-leave-active .title,
.grow-leave-active .body {
  animation: arrive 140ms ease reverse forwards;
}

@media (prefers-reduced-motion: reduce) {
  .grow-enter-active,
  .grow-leave-active,
  .panel .title,
  .panel .body {
    animation: none;
  }
}
</style>
