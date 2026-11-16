import type { Ref } from 'vue'
import type { FieldParts } from '~/field/field'
import { ContourField } from '~/field/field'

type Parts = { [K in keyof FieldParts]: Ref<FieldParts[K] | undefined> }

export function useContourField(parts: Parts) {
  const paused = ref(false)
  const reduced = ref(false)
  let engine: ContourField | null = null
  let sizer: ResizeObserver | undefined
  let themes: MutationObserver | undefined
  let seen: IntersectionObserver | undefined

  const relayout = () => engine?.relayout()
  // the entrance slides everything 8 px, so measure again once it ends
  const onSettled = (e: AnimationEvent) => {
    if ((e.target as Element).classList.contains('rise')) relayout()
  }
  // at most one pulse every 900 ms
  const onEnter = () => engine?.pulse(0.6, 900)

  // they never stop by themselves, so the portrait is the pause switch
  function toggle() {
    paused.value = !paused.value
    engine?.setPaused(paused.value)
    if (!paused.value) engine?.pulse(0.9, 0)
    try {
      sessionStorage.setItem('field-paused', paused.value ? '1' : '0')
    }
    catch {
    }
  }

  onMounted(() => {
    const host = parts.host.value
    const field = parts.field.value
    const box = parts.box.value
    if (!host || !field || !box) throw new Error('useContourField needs the page, the canvas and the portrait')
    reduced.value = matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      paused.value = sessionStorage.getItem('field-paused') === '1'
    }
    catch {
      paused.value = false
    }
    engine = new ContourField({ host, field, box }, reduced.value)
    engine.setPaused(paused.value)
    engine.start()

    // only a width change moves the portrait or the text; an opening project changes the height every frame and must not rebuild the contours
    let width = 0
    sizer = new ResizeObserver(() => {
      if (host.clientWidth === width) return
      width = host.clientWidth
      relayout()
    })
    sizer.observe(host)
    themes = new MutationObserver(relayout)
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    seen = new IntersectionObserver(([entry]) => engine?.setVisible(!!entry?.isIntersecting))
    seen.observe(field)
    // the text moves when the fonts arrive
    document.fonts.ready.then(relayout)
    host.addEventListener('animationend', onSettled)
    box.addEventListener('pointerenter', onEnter)
  })

  onBeforeUnmount(() => {
    sizer?.disconnect()
    themes?.disconnect()
    seen?.disconnect()
    parts.host.value?.removeEventListener('animationend', onSettled)
    parts.box.value?.removeEventListener('pointerenter', onEnter)
    engine?.destroy()
    engine = null
  })

  return { paused, reduced, toggle }
}
