<script setup lang="ts">
defineProps<{ playing?: boolean, running: boolean }>()
const emit = defineEmits<{ barend: [] }>()

// rest and swing are shares of a bar's full height; each bar keeps its own time, so the four never move together
const BARS = [
  { rest: 0.55, swing: 0.95, beat: '0.9s' },
  { rest: 1, swing: 0.35, beat: '1.15s' },
  { rest: 0.75, swing: 0.3, beat: '0.8s' },
  { rest: 0.4, swing: 0.9, beat: '1.05s' },
]
</script>

<template>
  <span class="now-listening-eq" :class="{ playing, run: running }" aria-hidden="true" @animationend="emit('barend')">
    <span v-for="(b, i) in BARS" :key="i" class="bar" :style="{ '--rest': b.rest, '--swing': b.swing, '--beat': b.beat }" />
  </span>
</template>

<style scoped>
.now-listening-eq {
  display: inline-flex;
  flex: none;
  align-items: flex-end;
  gap: 2px;
  width: 18px;
  height: 12px;
  padding: 0 2px;
  color: var(--ink-3);
  transition: color 160ms ease;
}

.now-listening-eq.playing {
  color: var(--ink);
}

.bar {
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: currentColor;
  transform-origin: 50% 100%;
  transform: scaleY(var(--rest));
}

@keyframes eq {
  from {
    transform: scaleY(var(--rest));
  }

  to {
    transform: scaleY(var(--swing));
  }
}

.run .bar {
  animation: eq var(--beat) ease-in-out 4 alternate;
}

@media (prefers-reduced-motion: reduce) {
  .run .bar {
    animation: none;
  }
}
</style>
