// rootMargin below: a 1% reading band 35% down the viewport
export function useActiveSection(ids: string[]) {
  const active = ref<string | null>(null)
  const nuxtApp = useNuxtApp()
  const inside = new Set<string>()
  let io: IntersectionObserver | undefined
  let unhook: (() => void) | undefined

  function observe() {
    io?.disconnect()
    inside.clear()
    active.value = null
    const els = ids.map(id => document.getElementById(id)).filter(el => el !== null)
    if (!els.length) return
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inside.add(e.target.id)
        else inside.delete(e.target.id)
      }
      active.value = ids.find(id => inside.has(id)) ?? null
    }, { rootMargin: '-35% 0px -64% 0px' })
    for (const el of els) io.observe(el)
  }

  onMounted(() => {
    observe()
    unhook = nuxtApp.hook('page:finish', () => observe())
  })

  onBeforeUnmount(() => {
    io?.disconnect()
    unhook?.()
  })

  return active
}
