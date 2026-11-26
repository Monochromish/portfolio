<script setup lang="ts">
defineProps<{ src: string }>()

const GIVE_UP_MS = 30_000
const video = ref<HTMLVideoElement | null>(null)
const started = ref(false)
const ready = ref(false)

function savesData(n: Navigator) {
  return 'connection' in n && typeof n.connection === 'object' && n.connection !== null && 'saveData' in n.connection && n.connection.saveData === true
}

// the whole loop is in the browser, so it plays without a stall once shown
function fullyBuffered(v: HTMLVideoElement) {
  const { buffered, duration } = v
  return Number.isFinite(duration) && buffered.length === 1 && buffered.start(0) <= 0.1 && buffered.end(0) >= duration - 0.1
}

function check() {
  const v = video.value
  if (!v || ready.value || !fullyBuffered(v)) return
  v.currentTime = 0
  ready.value = true
}

onMounted(() => {
  // Safari plays Apple's streams itself; other browsers keep the still cover
  if (!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || savesData(navigator)) return
  let giveUp = 0
  const begin = () => {
    started.value = true
    giveUp = window.setTimeout(() => {
      if (!ready.value) started.value = false
    }, GIVE_UP_MS)
  }
  // nothing loads until the page has, and the browser is idle
  const idle = () => 'requestIdleCallback' in window ? requestIdleCallback(begin, { timeout: 4000 }) : setTimeout(begin, 1000)
  if (document.readyState === 'complete') idle()
  else addEventListener('load', idle, { once: true })
  onBeforeUnmount(() => {
    removeEventListener('load', idle)
    clearTimeout(giveUp)
  })
})
</script>

<template>
  <video
    v-if="started"
    ref="video"
    class="motion"
    :class="{ ready }"
    :src="src"
    muted
    autoplay
    loop
    playsinline
    preload="auto"
    disablepictureinpicture
    disableremoteplayback
    aria-hidden="true"
    tabindex="-1"
    @progress="check"
    @canplaythrough="check"
    @timeupdate="check"
    @error="started = false"
  />
</template>

<style scoped>
.motion {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  opacity: 0;
  transition: opacity 600ms ease;
  pointer-events: none;
}

.motion.ready {
  opacity: 1;
}
</style>
