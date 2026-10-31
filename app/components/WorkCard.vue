<script lang="ts">
type RGB = [number, number, number]

// ink opacities for card text, raised only as far as 4.5:1 requires
const AA = 4.6
const BODY = 0.88
const META = 0.78
// peak glow opacity, and the share of it reaching the nearest text (set by the CSS gradient stops)
const GLOW_MAX = 0.6
const GLOW_REACH = 0.3
// max text opacity
const TEXT_CAP = 0.94

const parse = (hex: string): RGB => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const linear = (c: number) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const luminance = (c: RGB) => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2])
function contrast(a: RGB, b: RGB) {
  const x = luminance(a) + 0.05
  const y = luminance(b) + 0.05
  return Math.max(x, y) / Math.min(x, y)
}
const over = (top: RGB, base: RGB, a: number) => top.map((c, i) => c * a + base[i]! * (1 - a)) as RGB

function largest(ok: (t: number) => boolean) {
  if (ok(1)) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (ok(mid)) lo = mid
    else hi = mid
  }
  return lo
}

function floor(ink: RGB, bg: RGB) {
  if (contrast(ink, bg) < AA) return Number.POSITIVE_INFINITY
  return 1 - largest(t => contrast(over(ink, bg, 1 - t), bg) >= AA)
}

function cardColors(field: string, ink: string, glow = field) {
  const f = parse(field)
  const k = parse(ink)
  const g = parse(glow)
  const lit = (t: number) => over(g, f, GLOW_MAX * GLOW_REACH * t)
  const strength = largest(t => floor(k, lit(t)) <= TEXT_CAP)
  const least = Math.min(1, floor(k, lit(strength)))
  const triplet = (c: RGB) => c.map(Math.round).join(' ')
  return {
    '--field': field,
    '--ink-rgb': triplet(k),
    '--glow': triplet(g),
    '--glow-a': (GLOW_MAX * strength).toFixed(3),
    '--shade': triplet(f.map(c => c * 0.3) as RGB),
    '--a-body': Math.max(BODY, least).toFixed(3),
    '--a-meta': Math.max(META, least).toFixed(3),
  }
}
</script>

<script setup lang="ts">
import type { Project } from '#shared/work'

const props = defineProps<{ project: Project }>()

const card = computed(() => props.project.shots.length > 0)
const colors = computed(() => card.value
  ? cardColors(props.project.field, props.project.ink, props.project.glow)
  : { '--field': props.project.field })
const meta = computed(() => [props.project.role, props.project.org, props.project.period].filter(Boolean))
const titleId = computed(() => `work-${props.project.slug}`)

const overhang = computed(() => {
  const { stage, shots } = props.project
  if (!stage || !shots.length) return 0
  const [w = 1, h = 1] = stage.wide.split('/').map(Number)
  const lowest = Math.max(...shots.map(s => s.wide.y / 100 * h / w + s.wide.width / 100 * s.height / s.width))
  return Math.max(0, lowest - h / w)
})
</script>

<template>
  <article class="project" :class="{ card }" :style="{ ...colors, '--overhang': overhang.toFixed(4) }" :aria-labelledby="titleId">
    <div class="lead">
      <div class="head">
        <h3 :id="titleId" class="name">{{ project.name }}</h3>
        <p class="meta-line">
          <template v-for="(part, i) in meta" :key="i">
            <span :class="{ keep: part.length <= 28 }">{{ part }}<template v-if="i < meta.length - 1"><span aria-hidden="true">&nbsp;·</span><span class="sr-only">,</span></template></span>{{ i < meta.length - 1 ? ' ' : '' }}
          </template>
        </p>
        <p class="summary">{{ project.summary }}</p>
        <p v-if="project.links.length || project.stats?.length" class="foot">
          <a v-for="link in project.links" :key="link.href" class="out" :href="link.href" rel="noopener">{{ link.label }}<span class="i-site-arrow-up-right" aria-hidden="true" /></a>
          <span v-for="s in project.stats" :key="s.label" class="stat tnum"><strong>{{ s.value }}</strong> {{ s.label }}<a v-if="s.note" class="mark" :href="`#${s.note}`" aria-label="How this is estimated">*</a></span>
        </p>
      </div>
      <WorkMedia v-if="card" :shots="project.shots" :stage="project.stage" />
    </div>
    <div class="details">
      <ul v-if="project.points.length" class="points">
        <li v-for="point in project.points" :key="point">{{ point }}</li>
      </ul>
      <p v-if="project.footnote" :id="project.footnote.id" class="small footnote">* {{ project.footnote.text }}<template v-if="project.footnote.link">{{ ' ' }}<a class="link" :href="project.footnote.link.href" rel="noopener">{{ project.footnote.link.label }}</a>.</template></p>
      <p v-if="project.note" class="small">{{ project.note }}</p>
    </div>
  </article>
</template>

<style scoped>
/* the .section content width; a wide card adds its padding */
.lead,
.details {
  max-width: calc(40rem - 48px);
  margin-inline: auto;
}
.name {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.project:not(.card) .name {
  color: color-mix(in oklab, var(--field) 72%, var(--ink));
}
:root.dark .project:not(.card) .name {
  color: color-mix(in oklab, var(--field) 20%, var(--ink));
}
.meta-line {
  margin: 3px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.keep {
  white-space: nowrap;
}
.summary {
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 1.625;
  color: var(--ink-2);
}
.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 20px;
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.6;
}
.out {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 550;
  color: var(--ink);
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in srgb, var(--ink) 30%, transparent);
  transition: text-decoration-color 150ms ease;
}
/* a 44 px tap target */
.out::after {
  content: '';
  position: absolute;
  inset: -10px -6px;
}
.out span {
  font-size: 17px;
  color: var(--ink-3);
  transition: color 150ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .out:hover {
    text-decoration-color: var(--ink);
  }
  .out:hover span {
    color: var(--ink-2);
  }
}
.stat {
  color: var(--ink-2);
}
.stat strong {
  font-weight: 650;
  color: var(--ink);
}
.mark {
  position: relative;
  padding-left: 1px;
  font-weight: 600;
  vertical-align: 0.35em;
  line-height: 0;
  color: inherit;
  text-decoration: none;
}
.mark::after {
  content: '';
  position: absolute;
  inset: -10px -8px;
}
/* clears the fixed header and the line above */
.footnote {
  scroll-margin-top: 120px;
}

.details {
  margin-top: 14px;
}
.points {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink-2);
}
.points li {
  position: relative;
  padding-left: 17px;
  text-wrap: pretty;
}
.points li::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 0.66em;
  width: 5px;
  height: 5px;
  border-radius: 1.5px;
  background: color-mix(in oklab, var(--field) 72%, var(--ink));
  opacity: 0.75;
}
:root.dark .points li::before {
  background: color-mix(in oklab, var(--field) 45%, var(--ink));
}
.small {
  margin: 14px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-3);
}
.small + .small {
  margin-top: 6px;
}

.card .lead {
  position: relative;
  display: flow-root;
  border-radius: 12px;
  background: var(--field);
  color: rgb(var(--ink-rgb) / var(--a-body));
  box-shadow:
    0 1px 2px rgb(var(--shade) / 0.16),
    0 14px 28px -16px rgb(var(--shade) / 0.32),
    0 34px 64px -34px rgb(var(--shade) / 0.5);
}
:root.dark .card .lead {
  box-shadow:
    inset 0 0 0 1px rgb(var(--ink-rgb) / 0.08),
    0 1px 2px rgb(var(--shade) / 0.5),
    0 24px 48px -28px rgb(var(--shade) / 0.9);
}
/* these stops set GLOW_REACH */
.card .lead::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--glow-a);
  background: radial-gradient(
    150% 110% at 100% 100%,
    rgb(var(--glow)) 0%,
    rgb(var(--glow) / 0.62) 18%,
    rgb(var(--glow) / 0.3) 36%,
    rgb(var(--glow) / 0.1) 54%,
    rgb(var(--glow) / 0) 72%
  );
}
.card ::selection {
  background: rgb(var(--ink-rgb) / 0.28);
  color: rgb(var(--ink-rgb));
}
.card .lead :focus-visible {
  outline-color: rgb(var(--ink-rgb));
}
.card .head {
  position: relative;
  padding: 32px 32px 0;
}
.card .name {
  color: rgb(var(--ink-rgb));
}
.card .meta-line {
  color: rgb(var(--ink-rgb) / var(--a-meta));
}
.card .summary,
.card .stat {
  color: inherit;
}
.card .stat strong,
.card .out {
  color: rgb(var(--ink-rgb));
}
.card .out {
  text-decoration-color: rgb(var(--ink-rgb) / 0.45);
}
.card .out span {
  color: rgb(var(--ink-rgb) / var(--a-meta));
}
@media (hover: hover) and (pointer: fine) {
  .card .out:hover {
    text-decoration-color: rgb(var(--ink-rgb));
  }
  .card .out:hover span {
    color: rgb(var(--ink-rgb));
  }
}
.card .details {
  margin-top: 28px;
}

/* the WorkMedia wide breakpoint */
@container work (min-width: 800px) {
  .card .lead {
    max-width: calc(40rem + 48px);
  }
  .card .head {
    padding: 48px 48px 0;
  }
  /* min() is the WorkMedia wide composition width */
  .card .details {
    margin-top: calc(min(1040px, 100cqi + 16px) * var(--overhang) + 56px);
  }
}
</style>
