<script setup lang="ts">
defineProps<{
  left: boolean
  reaching: boolean
  asked: number
  from?: DOMRect
}>()
const emit = defineEmits<{ reach: [], leave: [e: MouseEvent] }>()
</script>

<template>
  <div class="home-yours" data-wall-clear data-wall-origin>
    <button v-if="!left" type="button" class="ask" @pointerenter="emit('reach')" @focus="emit('reach')" @click="emit('leave', $event)">
      <span class="slot">Yours goes here</span>
      <span class="button soft cta">Leave a sticker</span>
    </button>
    <!-- one place for the pad whether or not a sticker has been left, so it is never rebuilt part way through leaving one -->
    <div :class="left ? 'slot taken' : 'waiting'">
      <LazyGuestbookSection v-if="reaching || left" overlay :asked="asked" :from="from" />
    </div>
  </div>
</template>

<style scoped>
/* as tall with a sticker left as without, so leaving one does not shrink the page under the visitor */
.home-yours {
  display: grid;
  align-content: start;
  justify-items: center;
  min-height: calc(min(78vw, 330px) * 214 / 288 + 30px + 44px);
}

.ask {
  display: grid;
  justify-items: center;
  gap: 30px;
  border-radius: 26px;
  cursor: pointer;
}

.slot {
  display: grid;
  place-items: center;
  width: min(78vw, 330px);
  aspect-ratio: 288 / 214;
  border: 1.5px dashed color-mix(in srgb, var(--ink) 40%, transparent);
  border-radius: 26px;
  rotate: -4deg;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--ink-3);
  transition:
    rotate 260ms var(--ease-out),
    border-color 150ms ease,
    color 150ms ease,
    background-color 150ms ease;
}

/* the slot once it is taken: a solid edge, and the thanks where the invitation was */
.slot.taken {
  padding: 0 var(--s5);
  border-style: solid;
  border-color: var(--line-strong);
  font-family: inherit;
  letter-spacing: 0;
}

@media (hover: hover) and (pointer: fine) {
  .ask:hover .slot {
    rotate: -1.5deg;
    border-color: var(--ink-3);
    background: var(--fill);
    color: var(--ink);
  }
}

@media (prefers-reduced-motion: reduce) {
  .slot {
    transition: none;
  }
}

@media (hover: hover) and (pointer: fine) {
  .ask:hover .cta {
    --limn-edge: var(--edge-lift);
    background: var(--fill-hover);
  }
}

.waiting {
  position: absolute;
}
</style>
