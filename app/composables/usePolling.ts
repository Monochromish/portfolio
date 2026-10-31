import type { Ref } from 'vue'

export type PollState = 'loading' | 'ready' | 'failed'

export function usePolling<T>(url: string, target: Ref<Element | null | undefined>, every: (data: T | undefined) => number | null = () => null) {
  const { data: fresh, status, refresh } = useLazyFetch<T>(url, {
    key: `poll:${url}`,
    server: false,
    dedupe: 'defer',
    timeout: 10_000,
  })

  const data = shallowRef<T>()
  const updatedAt = ref(0)
  const state = computed<PollState>(() => data.value !== undefined ? 'ready' : status.value === 'error' ? 'failed' : 'loading')

  let timer: ReturnType<typeof setTimeout> | undefined
  let settledAt = 0
  let inView = false

  function schedule() {
    if (import.meta.server) return
    clearTimeout(timer)
    const ms = every(data.value)
    if (ms === null || !inView || document.visibilityState !== 'visible' || status.value === 'pending') return
    timer = setTimeout(() => refresh(), Math.max(0, settledAt + ms - Date.now()))
  }

  watch(status, (s) => {
    if (s !== 'success' && s !== 'error') return
    if (s === 'success' && fresh.value != null) {
      data.value = fresh.value as T
      updatedAt.value = Date.now()
    }
    settledAt = Date.now()
    schedule()
  }, { immediate: true })

  watch(target, (el, _, onCleanup) => {
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      inView = !!entry?.isIntersecting
      if (inView) schedule()
      else clearTimeout(timer)
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    onCleanup(() => {
      io.disconnect()
      inView = false
      clearTimeout(timer)
    })
  }, { flush: 'post' })

  function onVisibility() {
    if (document.visibilityState === 'visible') schedule()
    else clearTimeout(timer)
  }

  onMounted(() => document.addEventListener('visibilitychange', onVisibility))
  onBeforeUnmount(() => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { data, state, updatedAt }
}

export function useNow(every = 30_000) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  const tick = () => {
    now.value = Date.now()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') tick()
  }

  onMounted(() => {
    tick()
    timer = setInterval(tick, every)
    document.addEventListener('visibilitychange', onVisibility)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return now
}
