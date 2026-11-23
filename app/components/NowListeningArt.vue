<script setup lang="ts">
defineProps<{
  size: number
  src?: string | null
  srcset?: string
  sizes?: string
  lazy?: boolean
  loaded?: boolean
  large?: boolean
  /** A placeholder while the tracks load: no glyph and no picture. */
  blank?: boolean
}>()
const emit = defineEmits<{ load: [], error: [] }>()
</script>

<template>
  <span class="now-listening-art" :class="{ large, blank }">
    <template v-if="!blank">
      <span class="i-site-music" aria-hidden="true" />
      <img
        v-if="src"
        class="picture"
        :class="{ loaded }"
        :src="src"
        :srcset="srcset"
        :sizes="sizes"
        alt=""
        :width="size"
        :height="size"
        :loading="lazy ? 'lazy' : undefined"
        decoding="async"
        @load="emit('load')"
        @error="emit('error')"
      >
    </template>
  </span>
</template>

<style scoped>
.now-listening-art {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border-radius: 5px;
  background: var(--surface);
  font-size: 18px;
  color: var(--ink-3);
}

.now-listening-art::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--line);
  pointer-events: none;
}

.now-listening-art.large {
  width: 148px;
  height: 148px;
  border-radius: 10px;
  font-size: 40px;
}

@media (max-width: 640px) {
  .now-listening-art.large {
    width: 112px;
    height: 112px;
  }
}

.now-listening-art.blank {
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.picture {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}

.picture.loaded {
  opacity: 1;
}
</style>
