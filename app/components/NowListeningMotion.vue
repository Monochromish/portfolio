<script setup lang="ts">
const props = defineProps<{ src: string }>()

const GIVE_UP_MS = 30_000
const video = ref<HTMLVideoElement | null>(null)
const started = ref(false)
const ready = ref(false)
const native = ref(true)
let player: { destroy: () => void } | null = null

function savesData(n: Navigator) {
  return 'connection' in n && typeof n.connection === 'object' && n.connection !== null && 'saveData' in n.connection && n.connection.saveData === true
}

// the whole loop is in the browser, so it plays without a stall once shown
function fullyBuffered(v: HTMLVideoElement) {
  const { buffered, duration } = v
  return Number.isFinite(duration) && buffered.length === 1 && buffered.start(0) <= 0.1 && buffered.end(0) >= duration - 0.1
}

function stop() {
  started.value = false
  player?.destroy()
  player = null
}

// browsers other than Safari play Apple's streams through hls.js, fetched only once the page is done
async function attach() {
  await nextTick()
  const { default: Hls } = await import('hls.js/light')
  if (!video.value || !started.value || !Hls.isSupported()) return stop()
  // the cover is small, so the stream never picks a size larger than it is shown at
  const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 120 })
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) stop()
  })
  hls.loadSource(props.src)
  hls.attachMedia(video.value)
  player = hls
}

function check() {
  const v = video.value
  if (!v || ready.value || !fullyBuffered(v)) return
  v.currentTime = 0
  ready.value = true
}

onMounted(() => {
  native.value = !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')
  if (!native.value && !('MediaSource' in window) && !('ManagedMediaSource' in window)) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || savesData(navigator)) return
  let giveUp = 0
  const begin = () => {
    started.value = true
    giveUp = window.setTimeout(() => {
      if (!ready.value) stop()
    }, GIVE_UP_MS)
    if (!native.value) attach().catch(stop)
  }
  // nothing loads until the page has, and the browser is idle
  const idle = () => 'requestIdleCallback' in window ? requestIdleCallback(begin, { timeout: 4000 }) : setTimeout(begin, 1000)
  if (document.readyState === 'complete') idle()
  else addEventListener('load', idle, { once: true })
  onBeforeUnmount(() => {
    removeEventListener('load', idle)
    clearTimeout(giveUp)
    player?.destroy()
  })
})
</script>

<template>
  <video
    v-if="started"
    ref="video"
    class="motion"
    :class="{ ready }"
    :src="native ? src : undefined"
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
    @error="stop"
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
