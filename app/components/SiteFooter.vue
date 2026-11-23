<script setup lang="ts">
const links = [
  { label: 'Email', href: 'mailto:himanshu.adwani@outlook.com' },
  { label: 'GitHub', href: 'https://github.com/Monochromish' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/himanshu-adwani' },
  { label: 'Handshake', href: 'https://app.joinhandshake.com/profiles/8shxru' },
  { label: 'Resume', href: '/Himanshu_Adwani_Resume.pdf' },
]

const REPO = 'https://github.com/Monochromish/portfolio'
const { commit } = useRuntimeConfig().public
const source = commit ? `${REPO}/commit/${commit}` : REPO
const short = commit.slice(0, 7)
</script>

<template>
  <footer class="site-footer">
    <ul class="links">
      <li v-for="l in links" :key="l.label">
        <a class="chip link" :href="l.href" :rel="l.href.startsWith('http') ? 'noopener' : undefined">{{ l.label }}</a>
      </li>
    </ul>
    <a class="chip source" :href="source" rel="noopener">
      <span class="i-site-github glyph" aria-hidden="true" />
      <span><span class="sr-only">Source code, </span>Monochromish/portfolio<span v-if="short" class="hash">#{{ short }}</span></span>
    </a>
  </footer>
</template>

<style scoped>
/* each chip's padding hangs outside the column, so the text keeps to its edges */
.site-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s1) var(--s2);
}

.links {
  display: flex;
  flex-wrap: wrap;
  margin: 0 0 0 -7px;
  padding: 0;
  list-style: none;
}

/* all five links fit one row at 375 px */
@media (max-width: 640px) {
  .links {
    margin-left: -6px;
  }
}

@media (max-width: 372px) {
  .links {
    margin-left: -5px;
  }
}

@media (max-width: 357px) {
  .links {
    display: grid;
    grid-template-columns: repeat(3, max-content);
  }
}

.chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  border-radius: var(--r1);
  text-decoration: none;
  transition:
    background-color 150ms ease,
    transform 160ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .chip:hover {
    background: var(--fill);
  }
}

.chip:active {
  background: var(--fill-hover);
  transform: scale(0.97);
}

@media (pointer: coarse) {
  .chip {
    min-height: 44px;
  }
}

.link {
  padding: 0 7px;
  font-size: 15px;
  font-weight: 550;
  color: var(--ink);
}

@media (max-width: 640px) {
  .link {
    padding: 0 6px;
  }
}

@media (max-width: 372px) {
  .link {
    padding: 0 5px;
  }
}

.source {
  gap: 6px;
  margin-right: -8px;
  padding: 0 8px;
  font-size: 13px;
  color: var(--ink-2);
}

/* wrapped below the links, it starts on their edge */
@media (max-width: 700px) {
  .source {
    margin: 0 0 0 -8px;
  }
}

@media (max-width: 640px) {
  .source {
    margin-left: -6px;
    padding: 0 6px;
  }
}

.glyph {
  font-size: 16px;
  color: var(--ink-3);
}

.hash {
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
</style>
