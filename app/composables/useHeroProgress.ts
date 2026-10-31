export const useIntroPassed = () => useState('intro-passed', () => false)

export function useHeroProgress() {
  const covered = ref(false)
  const passed = useIntroPassed()
  const surface = useToolbarSurface()
  surface.value = 'lagoon'
  let raf = 0
  let targets: HTMLElement[] = []
  let header: HTMLElement | null = null
  let sheet: HTMLElement | null = null
  let intro: HTMLElement | null = null
  let written = ''

  function update() {
    raf = 0
    const vh = document.documentElement.clientHeight
    const bar = header?.offsetHeight ?? 0
    const edge = sheet?.getBoundingClientRect().top ?? vh
    const nameTop = intro?.getBoundingClientRect().top ?? 0
    const p = Math.min(1.2, Math.max(0, window.scrollY / vh))
    const value = p.toFixed(4)
    if (value === written) return
    written = value
    for (const el of targets) el.style.setProperty('--p', value)
    // fully frosted 40 px after the sheet edge passes under the header
    const frost = Math.min(1, Math.max(0, (bar - edge) / 40))
    header?.style.setProperty('--frost', frost.toFixed(3))
    covered.value = edge <= 0
    // 8 px of hysteresis keeps the header name from flickering at the edge
    if (edge <= nameTop) passed.value = true
    else if (edge > nameTop + 8) passed.value = false
    surface.value = frost >= 1 ? 'paper' : 'lagoon'
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update)
  }

  onMounted(() => {
    targets = [...document.querySelectorAll<HTMLElement>('[data-hero-progress]')]
    header = document.querySelector<HTMLElement>('.site-header')
    sheet = document.querySelector<HTMLElement>('.sheet')
    intro = document.getElementById('intro-name')
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    for (const el of targets) el.style.removeProperty('--p')
    header?.style.removeProperty('--frost')
    surface.value = 'paper'
    passed.value = false
  })

  return { covered }
}
