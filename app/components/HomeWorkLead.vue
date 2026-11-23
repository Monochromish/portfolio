<script setup lang="ts">
import type { Project } from '#shared/work'

const props = defineProps<{ project: Project, cited: boolean }>()
const emit = defineEmits<{ again: [e: MouseEvent] }>()

// its first screenshot is on the card, so the ones under it start from the second
const cover = props.project.shots[0]!
const covers = cover.light
  ? [{ file: cover.file, alt: cover.alt, only: 'dark' }, { file: cover.light.file, alt: cover.light.alt, only: 'light' }]
  : [{ file: cover.file, alt: cover.alt, only: null }]
const srcset = (file: string) => cover.widths.map(w => `/work/${file}-${w}.webp ${w}w`).join(', ')

// reached for by the visitor: the screenshots load before the project opens
const reached = ref(false)
</script>

<template>
  <article :id="`work-${project.slug}`" class="feature" :style="{ '--field': project.field, '--glow': project.glow ?? project.field, '--on': project.ink }">
    <div class="text">
      <h3 class="name">{{ project.name }}</h3>
      <p class="what">{{ project.brief }} · {{ project.period }}</p>
      <p class="summary">{{ project.summary }}</p>
      <p v-if="project.links.length" class="facts">
        <a v-for="l in project.links" :key="l.href" class="text-link reach fact" :href="l.href" rel="noopener">{{ l.label }}</a>
      </p>
      <p v-for="s in project.stats" :key="s.label" class="stat">
        <strong class="figure">{{ s.value }}</strong>
        <span class="caption">{{ s.label }}<FootnoteMark v-if="s.note" inherit :href="`#${s.note}`" @click="emit('again', $event)" /></span>
      </p>
    </div>
    <div class="cover">
      <img
        v-for="pic in covers"
        :key="pic.file"
        class="shot"
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
  <details class="deep" :data-for="`work-${project.slug}`" @pointerenter="reached = true" @focusin="reached = true" @touchstart.passive="reached = true">
    <HomeWorkToggle tag="summary" class="toggle">What I built there</HomeWorkToggle>
    <HomeWorkMore
      class="inside"
      :points="project.points"
      :shots="project.shots.slice(1)"
      :label="`More screenshots of ${project.name}`"
      :eager="reached"
      :footnote="project.footnote"
      :cited="cited"
    />
  </details>
</template>

<style scoped>
.feature {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 40px;
  min-height: 430px;
  padding: 44px 0 0 44px;
  overflow: clip;
  border-radius: 28px 28px 0 0;
  background:
    radial-gradient(120% 90% at 85% 110%, var(--glow) 0%, transparent 60%),
    var(--field);
  box-shadow:
    inset 0 1px 0 0 oklch(100% 0 0 / 0.22),
    inset 0 0 0 1px oklch(100% 0 0 / 0.08);
  color: var(--on);
  scroll-margin-top: var(--s5);
}

@media (max-width: 900px) {
  .feature {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s2);
    min-height: 0;
    padding: var(--s6) 0 0 28px;
  }
}

.text {
  display: flex;
  flex-direction: column;
  padding-bottom: 40px;
}

@media (max-width: 900px) {
  .text {
    padding: 0 28px var(--s2) 0;
  }
}

.name,
.what,
.summary,
.facts,
.stat {
  margin: 0;
  color: inherit;
}

.name {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.what {
  margin-top: 6px;
  font-size: var(--t-small);
  opacity: 0.9;
}

.summary {
  margin-top: 20px;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s1) var(--s5);
  margin-top: 14px;
  font-size: var(--t-small);
}

.feature .fact {
  color: inherit;
  text-decoration-color: color-mix(in srgb, currentColor 50%, transparent);
}

.stat {
  margin-top: auto;
  padding-top: 28px;
}

.figure {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(40px, 4vw, 56px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}

.caption {
  display: block;
  margin-top: var(--s2);
  font-size: var(--t-small);
  opacity: 0.9;
}

.cover {
  align-self: end;
  margin-top: var(--s3);
}

/* runs off the card's right edge; never wider than the file */
.shot {
  display: block;
  width: 132%;
  max-width: none;
  height: auto;
  border-top-left-radius: 14px;
  box-shadow:
    0 30px 60px -20px color-mix(in srgb, var(--field) 35%, oklch(0% 0 0)),
    0 0 0 1px oklch(100% 0 0 / 0.14);
}

.shot.only-dark,
:root.dark .shot.only-light {
  display: none;
}

:root.dark .shot.only-dark {
  display: block;
}

@media (max-width: 900px) {
  .shot {
    width: 118%;
  }
}

.deep {
  border-radius: 0 0 28px 28px;
  background: var(--surface);
  box-shadow: var(--edge);
}

.deep::details-content {
  block-size: 0;
  overflow: clip;
  transition:
    block-size 190ms var(--ease-out),
    content-visibility 190ms allow-discrete;
}

.deep[open]::details-content {
  block-size: auto;
  transition-duration: 240ms;
}

@media (prefers-reduced-motion: reduce) {
  .deep::details-content {
    transition: none;
  }
}

.toggle {
  padding: var(--s2) 28px var(--s2) 44px;
  border-radius: 0 0 28px 28px;
  list-style: none;
}

.toggle::-webkit-details-marker {
  display: none;
}

@media (max-width: 900px) {
  .toggle {
    padding: var(--s2) var(--s5) var(--s2) 28px;
  }
}

.inside {
  padding: var(--s2) 44px 36px;
}

@media (max-width: 900px) {
  .inside {
    padding: var(--s2) 28px 28px;
  }
}
</style>
