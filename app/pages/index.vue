<script setup lang="ts">
const { covered } = useHeroProgress()
const { alias, name } = useIdentity()

function onHeroFocus(e: FocusEvent) {
  if (window.scrollY > 0 && (e.target as Element).matches(':focus-visible')) window.scrollTo(0, 0)
}
</script>

<template>
  <div>
    <main id="content">
      <section class="hero" aria-labelledby="intro-name" data-hero-progress @focusin="onHeroFocus">
        <ClientOnly>
          <LagoonCanvas :covered="covered" />
        </ClientOnly>
        <div class="intro" data-lagoon-calm>
          <h1 id="intro-name">{{ name }}</h1>
          <p v-if="alias" class="aka">Himanshu Adwani, or Isaiah if that’s easier to say.</p>
          <p v-else class="aka">Isaiah works too, if that’s easier to say.</p>
          <p class="summary">
            Senior lead developer at <a href="https://cider.sh" rel="noopener">Cider</a>, the Apple Music client for
            Windows, macOS and Linux with close to a million users<a class="mark" href="#cider-count" aria-label="How this is estimated">*</a>
            and 250,000+ installs on <a href="https://flathub.org/apps/sh.cider.Cider" rel="noopener">Flathub</a> alone.
            Computer science at Penn State, graduating May 2028. Looking for a software engineering internship for summer 2027.
          </p>
          <ul class="links">
            <li><a class="primary" href="/Himanshu_Adwani_Resume.pdf"><span class="i-site-file" aria-hidden="true" />Resume</a></li>
            <li><a href="mailto:himanshu.adwani@outlook.com"><span class="i-site-mail" aria-hidden="true" />Email</a></li>
            <li><a href="https://github.com/Monochromish" rel="noopener"><span class="i-site-github" aria-hidden="true" />GitHub</a></li>
            <li><a href="https://www.linkedin.com/in/himanshu-adwani" rel="noopener"><span class="i-site-linkedin" aria-hidden="true" />LinkedIn</a></li>
          </ul>
        </div>
      </section>

      <div class="spacer" aria-hidden="true" />

      <div class="sheet">
        <div class="grabber" aria-hidden="true" />
        <WorkSection />
        <AboutSection />
        <WritingSection />
        <NowSection />
        <GuestbookSection />
      </div>
    </main>
    <div class="sheet-end">
      <SiteFooter />
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: var(--lagoon);
}
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #000;
  opacity: calc(var(--p, 0) * 0.25);
  pointer-events: none;
}
.intro {
  position: absolute;
  left: max(24px, 5vw, env(safe-area-inset-left));
  bottom: calc(64px + max(40px, 9vh));
  width: min(34rem, calc(100% - 2 * max(24px, env(safe-area-inset-left), env(safe-area-inset-right))));
  color: var(--ink-2);
  opacity: calc(1 - var(--p, 0) * 1.7);
  transform: translateY(calc(var(--p, 0) * -28px));
}
@media (prefers-reduced-motion: reduce) {
  .intro {
    transform: none;
  }
}
h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
.aka {
  margin: 2px 0 14px;
  font-size: 15px;
  color: var(--ink-2);
}
.summary {
  margin: 0;
  font-size: 16.5px;
  line-height: 1.62;
  color: var(--ink);
}
.summary a {
  color: var(--ink);
  text-decoration-color: color-mix(in srgb, var(--ink) 35%, transparent);
}
.summary .mark {
  position: relative;
  padding: 0 1px 0 0;
  font-weight: 600;
  vertical-align: 0.35em;
  line-height: 0;
  text-decoration: none;
}
.summary .mark::after {
  content: '';
  position: absolute;
  inset: -10px -8px;
}
/* a 44 px square target */
@media (pointer: coarse) {
  .summary .mark::after {
    inset: -22px -18px;
  }
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.links a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  font-weight: 550;
  color: var(--ink);
  text-decoration: none;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.links a span {
  font-size: 17px;
  opacity: 0.75;
}
@media (hover: hover) and (pointer: fine) {
  .links a:hover {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
}
.links a:active {
  background: color-mix(in srgb, var(--ink) 11%, transparent);
  transform: scale(0.97);
}
.links a.primary {
  background: var(--accent);
  color: var(--on-accent);
}
.links a.primary span {
  opacity: 1;
}
@media (hover: hover) and (pointer: fine) {
  .links a.primary:hover {
    background: color-mix(in srgb, var(--accent) 88%, var(--ink));
  }
}
.links a.primary:active {
  background: color-mix(in srgb, var(--accent) 82%, var(--ink));
}
@media (pointer: coarse) {
  .links a {
    min-height: 44px;
  }
}
@media (max-width: 480px) {
  .links {
    display: grid;
    grid-template-columns: repeat(2, max-content);
  }
}
.spacer {
  height: calc(100svh - 64px);
  pointer-events: none;
}
@media (max-height: 480px) {
  .intro {
    bottom: 76px;
    width: min(46rem, calc(100% - 2 * max(24px, env(safe-area-inset-left), env(safe-area-inset-right))));
  }
  .aka {
    margin-bottom: 10px;
  }
  .summary {
    line-height: 1.5;
  }
  .links {
    margin-top: 10px;
  }
}
@media (max-height: 340px) {
  .spacer {
    height: calc(100svh - 24px);
  }
  .intro {
    bottom: 36px;
  }
}
.sheet {
  display: flow-root;
  position: relative;
  z-index: 10;
  min-height: 100svh;
  background: var(--paper);
  border-radius: 22px 22px 0 0;
  box-shadow: var(--sheet-shadow);
}
.grabber {
  width: 38px;
  height: 5px;
  margin: 14px auto 0;
  border-radius: 9px;
  background: var(--line-strong);
}
/* the first card peeks into the 64px lip; a jump to Work lands under the header */
.sheet > :deep(.section:first-of-type) {
  padding-top: 22px;
  scroll-margin-top: 52px;
}
.sheet-end {
  display: flow-root;
  position: relative;
  z-index: 10;
  background: var(--paper);
}
/* a jump lands each heading below the header fade */
@media (max-width: 640px) {
  .sheet > :deep(.section ~ .section) {
    scroll-margin-top: 32px;
  }
}
</style>
