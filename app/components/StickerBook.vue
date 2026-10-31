<script setup lang="ts" generic="T extends Sticker">
import { stickerTemplate, stickerView } from '#shared/guestbook'
import type { Sticker } from '#shared/types'

defineProps<{ stickers: readonly T[] }>()
defineSlots<{ default?: (props: { sticker: T }) => unknown }>()

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

function lay(id: number) {
  let h = Math.imul(id ^ 0x5bd1e995, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h ^= h >>> 13
  const a = (h & 0xffff) / 0xffff
  const b = ((h >>> 16) & 0xffff) / 0xffff
  return { tilt: (a * 2 - 1) * 6, lift: (b * 2 - 1) * 7 }
}

function slot(s: Sticker) {
  const view = stickerView(stickerTemplate(s.template)!)
  const { tilt, lift } = lay(s.id)
  return { '--w': view.w, '--h': view.h, '--tilt': `${tilt.toFixed(2)}deg`, '--lift': `${lift.toFixed(1)}px` }
}

const label = (s: Sticker) => `${stickerTemplate(s.template)!.label} sticker, added ${day.format(s.createdAt)}`
</script>

<template>
  <ul class="sticker-book" role="list">
    <li v-for="s in stickers" :key="s.id" class="slot" :style="slot(s)">
      <div class="lay">
        <StickerArt :template="s.template" :strokes="s.strokes" :label="label(s)" />
      </div>
      <slot :sticker="s" />
    </li>
  </ul>
</template>

<style scoped>
.sticker-book {
  --k: 0.64;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lay {
  width: calc(var(--w) * var(--k) * 1px);
  aspect-ratio: var(--w) / var(--h);
  transform: translateY(var(--lift)) rotate(var(--tilt));
}
@media (max-width: 560px) {
  .sticker-book {
    --k: 0.5;
  }
}
</style>
