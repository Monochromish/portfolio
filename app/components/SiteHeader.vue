<script setup lang="ts">
const { name } = useIdentity()
const route = useRoute()
const error = useError()
// the home page has its own name and links: only the theme switch, and it scrolls away
const bare = computed(() => route.path === '/' && !error.value)
</script>

<template>
  <header class="site-header" :class="{ solid: !bare, bare }">
    <slot name="lead">
      <NuxtLink v-show="!bare" to="/" class="name">{{ name }}</NuxtLink>
    </slot>
    <nav class="nav" aria-label="Main">
      <SiteHeaderTabs v-show="!bare" />
      <ThemeToggle />
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px max(20px, env(safe-area-inset-right)) 18px max(20px, env(safe-area-inset-left));
  font-size: 15px;
  color: var(--ink);
}

.site-header::before {
  content: '';
  position: absolute;
  inset: 0 0 -24px;
  z-index: -1;
  background: linear-gradient(var(--paper) 40%, color-mix(in srgb, var(--paper) 0%, transparent));
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  mask-image: linear-gradient(#000 55%, transparent);
  opacity: var(--frost, 0);
  pointer-events: none;
}

.site-header.solid::before {
  opacity: 1;
}

.site-header.bare {
  position: absolute;
  justify-content: flex-end;
}

@media (prefers-reduced-transparency: reduce) {
  .site-header::before {
    background: var(--paper);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    mask-image: none;
  }
}

@media (max-width: 560px) {
  .site-header {
    gap: 12px;
    font-size: 14px;
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(6px, env(safe-area-inset-right));
  }
}

@media (max-width: 340px) {
  .site-header {
    font-size: 13px;
    padding-left: max(12px, env(safe-area-inset-left));
  }
}

.name {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .name {
    min-height: 44px;
  }
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 560px) {
  .nav {
    gap: 0;
  }
}
</style>
