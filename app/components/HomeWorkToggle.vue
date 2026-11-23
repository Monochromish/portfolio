<script setup lang="ts">
defineProps<{ tag: 'summary' | 'button' }>()
</script>

<template>
  <component :is="tag" class="home-work-toggle"><slot /><span class="plus" aria-hidden="true" /></component>
</template>

<style scoped>
.home-work-toggle {
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

[open] > .home-work-toggle .plus::after,
.home-work-toggle[aria-expanded='true'] .plus::after {
  transform: rotate(0);
}

@media (prefers-reduced-motion: reduce) {
  .plus::before,
  .plus::after {
    transition: none;
  }
}
</style>
