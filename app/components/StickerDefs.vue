<script setup lang="ts">
import { h } from 'vue'
import type { VNode } from 'vue'
import { STICKER_TEMPLATES, sharedStickerDefs, stickerDefs, stickerHitArea } from '#shared/guestbook'
import type { ArtNode } from '#shared/guestbook'

const art = [...sharedStickerDefs('stk-'), ...STICKER_TEMPLATES.flatMap(t => [...stickerDefs(t, 'stk-'), stickerHitArea(t, 'stk-')])]
const toVNode = ([tag, attrs, children]: ArtNode): VNode => h(tag, attrs, children?.map(toVNode))
const Defs = () => h('defs', art.map(toVNode))
</script>

<template>
  <svg class="sticker-defs" width="0" height="0" aria-hidden="true" focusable="false"><Defs /></svg>
</template>

<style scoped>
.sticker-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
