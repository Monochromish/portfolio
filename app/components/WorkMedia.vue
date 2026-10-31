<script setup lang="ts">
import type { Pose, Shot } from '#shared/work'

const props = defineProps<{ shots: Shot[], stage?: { wide: string, narrow: string } }>()

// wide from 848 px (800 px container): min(1040px, 100vw - 32px)
// narrow: card less 24 px a side; card is 592 px above 640 px, else 100vw - 40px
function sizes({ wide, narrow }: Shot) {
  return [
    `(min-width: 1072px) ${Math.round(10.4 * wide.width)}px`,
    `(min-width: 848px) calc((100vw - 32px) * ${wide.width / 100})`,
    `(min-width: 641px) ${Math.round(5.44 * narrow.width)}px`,
    `calc((100vw - 88px) * ${narrow.width / 100})`,
  ].join(', ')
}

const file = (name: string, w: number) => `/work/${name}-${w}.webp`

function pose(p: Pose, k: string) {
  return {
    [`--${k}x`]: `${p.x}%`,
    [`--${k}y`]: `${p.y}%`,
    [`--${k}w`]: `${p.width}%`,
    [`--${k}rx`]: `${p.rx}deg`,
    [`--${k}ry`]: `${p.ry}deg`,
    [`--${k}rz`]: `${p.rz}deg`,
  }
}

const images = computed(() => props.shots.flatMap((s) => {
  const image = (name: string, alt: string, theme?: 'night' | 'day') => ({
    name,
    alt,
    theme,
    src: file(name, s.widths[0]!),
    srcset: s.widths.map(w => `${file(name, w)} ${w}w`).join(', '),
    sizes: sizes(s),
    width: s.width,
    height: s.height,
    style: { ...pose(s.wide, 'w'), ...pose(s.narrow, 'n') },
  })
  return s.light ? [image(s.file, s.alt, 'night'), image(s.light.file, s.light.alt, 'day')] : [image(s.file, s.alt)]
}))

const media = ref<HTMLElement>()
const dark = useState('dark', () => false)
const mounted = ref(false)
const offstage = (theme?: 'night' | 'day') => !!theme && theme !== (mounted.value && dark.value ? 'night' : 'day')

onMounted(() => {
  mounted.value = true
  for (const img of media.value?.querySelectorAll<HTMLImageElement>('.night, .day') ?? []) {
    if (img.complete) img.decode().catch(() => {})
    else img.addEventListener('load', () => img.decode().catch(() => {}), { once: true })
  }
})
</script>

<template>
  <div ref="media" class="media" :style="{ '--wide': stage?.wide ?? '16 / 9', '--narrow': stage?.narrow ?? '4 / 3' }">
    <img
      v-for="img in images"
      :key="img.name"
      class="shot"
      :class="img.theme"
      :src="img.src"
      :srcset="img.srcset"
      :sizes="img.sizes"
      :width="img.width"
      :height="img.height"
      :alt="img.alt"
      :aria-hidden="offstage(img.theme) ? 'true' : undefined"
      :style="img.style"
      loading="lazy"
      :decoding="img.theme ? 'sync' : 'async'"
    >
  </div>
</template>

<style scoped>
.media {
  position: relative;
  aspect-ratio: var(--narrow);
  margin: 24px;
}
.shot {
  position: absolute;
  left: var(--nx);
  top: var(--ny);
  display: block;
  width: var(--nw);
  max-width: none;
  height: auto;
  border-radius: 5px;
  background: rgb(var(--shade));
  outline: 1px solid rgb(255 255 255 / 0.1);
  outline-offset: -1px;
  box-shadow:
    0 1px 2px rgb(var(--shade) / 0.25),
    0 6px 14px -6px rgb(var(--shade) / 0.35),
    0 22px 44px -16px rgb(var(--shade) / 0.55);
  transform: perspective(900px) rotateX(var(--nrx)) rotateY(var(--nry)) rotateZ(var(--nrz));
}
:root:not(.dark) .night,
:root.dark .day {
  opacity: 0;
  pointer-events: none;
}

/* spans the 1040 px page frame */
@container work (min-width: 800px) {
  .media {
    left: 50%;
    width: min(1040px, 100cqi + 16px);
    aspect-ratio: var(--wide);
    margin: 32px 0 0;
    translate: -50% 0;
  }
  .shot {
    left: var(--wx);
    top: var(--wy);
    width: var(--ww);
    border-radius: 7px;
    box-shadow:
      0 1px 2px rgb(var(--shade) / 0.25),
      0 8px 18px -6px rgb(var(--shade) / 0.35),
      0 30px 60px -18px rgb(var(--shade) / 0.55);
    transform: perspective(1600px) rotateX(var(--wrx)) rotateY(var(--wry)) rotateZ(var(--wrz));
  }
}
</style>
