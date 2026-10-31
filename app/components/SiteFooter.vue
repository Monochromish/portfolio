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
    <p class="line">
      <span class="will">Confidence that you will is overconfidence;</span>
      <span class="can">confidence that you can is what keeps you trying.</span>
    </p>
    <div class="row">
      <ul class="links">
        <li v-for="l in links" :key="l.label">
          <a :href="l.href" :rel="l.href.startsWith('http') ? 'noopener' : undefined">{{ l.label }}</a>
        </li>
      </ul>
      <a class="source" :href="source" rel="noopener">
        <span class="i-site-github" aria-hidden="true" />
        <span><span class="sr-only">Source code, </span>Monochromish/portfolio<span v-if="short" class="hash">#{{ short }}</span></span>
      </a>
    </div>
    <Wordmark class="mark" />
  </footer>
</template>

<style scoped>
.site-footer {
  width: min(1040px, calc(100% - 2 * max(24px, env(safe-area-inset-left), env(safe-area-inset-right))));
  margin: auto auto 0;
  padding-top: 160px;
}
.line {
  margin: 0;
  /* keeps the longer clause (21.4em) on one line */
  font-size: clamp(26px, 4.4vw - 2px, 44px);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.02em;
}
.line span {
  display: block;
  text-wrap: balance;
}
.will {
  color: var(--ink-3);
}
.can {
  color: var(--ink);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 24px;
  margin-top: 40px;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 2px;
  margin: 0 0 0 -10px;
  padding: 0;
  list-style: none;
}
.links a,
.source {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.links a {
  color: var(--ink);
  font-weight: 550;
}
.source {
  gap: 7px;
  margin-right: -10px;
  font-size: 14px;
  color: var(--ink-2);
}
.source > [class^='i-site'] {
  font-size: 16px;
  color: var(--ink-3);
}
.hash {
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
@media (hover: hover) and (pointer: fine) {
  .links a:hover,
  .source:hover {
    background: color-mix(in srgb, var(--ink) 7%, transparent);
  }
}
.links a:active,
.source:active {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
  transform: scale(0.97);
}
@media (pointer: coarse) {
  .links a,
  .source {
    min-height: 44px;
  }
}
.mark {
  margin-top: 72px;
}
@media (max-width: 640px) {
  .site-footer {
    width: calc(100% - 40px);
    padding-top: 120px;
  }
  /* all five fit one row at 375 px */
  .links {
    gap: 0;
    margin-left: -6px;
  }
  .links a {
    padding: 0 6px;
    font-size: 15px;
  }
  .source {
    margin: 0 0 0 -6px;
    padding: 0 6px;
  }
  .mark {
    margin-top: 48px;
  }
}
@media (max-width: 372px) {
  .links {
    margin-left: -5px;
  }
  .links a {
    padding: 0 5px;
  }
}
@media (max-width: 357px) {
  .links {
    display: grid;
    grid-template-columns: repeat(3, max-content);
  }
}
</style>
