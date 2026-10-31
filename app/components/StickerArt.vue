<script setup lang="ts">
import { inkPaths, inkTransform, stickerTemplate, stickerView } from '#shared/guestbook'
import type { StickerStroke } from '#shared/types'

const props = defineProps<{ template: string, strokes: readonly StickerStroke[], label?: string }>()

const t = computed(() => stickerTemplate(props.template)!)
const view = computed(() => stickerView(t.value))
const paths = computed(() => inkPaths(t.value, props.strokes))
</script>

<template>
  <svg
    class="sticker-art"
    :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <use :href="`#stk-${t.id}-base`" />
    <g :clip-path="`url(#stk-${t.id}-ink)`">
      <g :transform="inkTransform(t)" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path v-for="(p, i) in paths" :key="i" :d="p.d" :stroke="p.hex" :stroke-width="p.width" />
      </g>
    </g>
    <use :href="`#stk-${t.id}-gloss`" />
    <use class="sticker-dim" :href="`#stk-${t.id}-o`" :stroke-width="t.border * 2" />
  </svg>
</template>

<style>
.sticker-art {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.sticker-dim {
  display: none;
  fill: #000;
  stroke: #000;
  opacity: 0.12;
}
:root.dark .sticker-dim {
  display: inline;
}
</style>
