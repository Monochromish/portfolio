<script setup lang="ts">
import { earlier, projects } from '#shared/work'

const rows = [...earlier]
  .sort((a, b) => Number(b.year) - Number(a.year))
  .map((row) => {
    const cut = row.name.lastIndexOf(' ') + 1
    return { ...row, lead: row.name.slice(0, cut), tail: row.name.slice(cut) }
  })
</script>

<template>
  <section id="work" class="section work" aria-labelledby="work-title">
    <h2 id="work-title" class="sr-only">Work</h2>

    <div class="projects">
      <WorkCard v-for="project in projects" :key="project.slug" :project="project" />
    </div>

    <div class="col earlier">
      <h3 id="earlier-title" class="earlier-title">Earlier</h3>
      <ul class="rows" aria-labelledby="earlier-title">
        <li v-for="row in rows" :key="row.href" class="row">
          <div class="what">
            <p class="title">
              <a class="name link" :href="row.href" rel="noopener">{{ row.lead }}<span class="tail">{{ row.tail }}<span class="arrow i-site-arrow-up-right" aria-hidden="true" /></span></a>
            </p>
            <p class="note">{{ row.note }}</p>
          </div>
          <p class="facts meta">
            <span v-if="row.stars != null" class="stars">
              <span class="i-site-star" aria-hidden="true" />{{ row.stars.toLocaleString('en-US') }}<span class="sr-only"> stars</span>
            </span>
            <time :datetime="row.year">{{ row.year }}</time>
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.work {
  max-width: none;
  padding-inline: max(24px, env(safe-area-inset-left)) max(24px, env(safe-area-inset-right));
  overflow-x: clip;
  container: work / inline-size;
}
@media (max-width: 640px) {
  .work {
    padding-inline: max(20px, env(safe-area-inset-left)) max(20px, env(safe-area-inset-right));
  }
}
.col {
  max-width: calc(40rem - 48px);
  margin-inline: auto;
}
.projects > * + * {
  margin-top: clamp(56px, 4vw + 40px, 80px);
}
.earlier {
  margin-top: clamp(80px, 10vw, 104px);
}
.earlier-title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--ink);
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  border-bottom: 1px solid var(--line);
}
.row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 24px;
  padding: 13px 0 14px;
  border-top: 1px solid var(--line);
}
.title {
  margin: 0;
  line-height: 1.6;
}
.name {
  font-weight: 550;
}
.name::after {
  content: '';
  position: absolute;
  inset: 0 -12px;
  border-radius: 8px;
  transition: background-color 160ms var(--ease-out);
}
.name:active::after {
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  transition-duration: 0ms;
}
.tail {
  white-space: nowrap;
}
.arrow {
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
  font-size: 18px;
  color: var(--ink-3);
  transition: color 150ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .row:hover .arrow {
    color: var(--ink-2);
  }
}
.note {
  margin: 2px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink-2);
}
.facts {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 25.6px;
  margin: 0;
  white-space: nowrap;
}
.stars {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.stars > span:first-child {
  font-size: 18px;
}
</style>
