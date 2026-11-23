<script setup lang="ts">
defineProps<{
  href: string
  raised?: boolean
  inherit?: boolean
}>()
</script>

<template>
  <a class="footnote-mark" :class="{ raised, inherit }" :href="href" aria-label="How this is counted">*</a>
</template>

<style scoped>
.footnote-mark {
  position: relative;
  margin-left: 0.08em;
  font-family: 'Figtree', 'Figtree Fallback', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0;
  vertical-align: 0.25em;
  color: var(--ink-3);
  text-decoration: none;
}

/* a 44 px target around a small mark */
.footnote-mark::after {
  content: '';
  position: absolute;
  inset: -16px -14px;
}

.footnote-mark.raised {
  vertical-align: 1em;
}

.footnote-mark.inherit {
  color: inherit;
}
</style>
