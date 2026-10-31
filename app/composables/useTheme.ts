export function useTheme() {
  const dark = useState('dark', () => false)
  let wanted = dark.value
  let flippedAt = -1e9

  function apply(d: boolean) {
    dark.value = d
    document.documentElement.classList.toggle('dark', d)
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish()
  }

  function toggle(e?: MouseEvent) {
    const next = !wanted
    wanted = next
    const os = matchMedia('(prefers-color-scheme: dark)').matches
    try {
      localStorage.setItem('theme', next === os ? 'system' : next ? 'dark' : 'light')
    }
    catch {
    }
    // a flip within 600 ms of the last skips the 200 ms crossfade, which would swallow the next click
    const quick = performance.now() - flippedAt < 600
    flippedAt = performance.now()
    // detail 0 means a key press
    if (!document.startViewTransition || e?.detail === 0 || quick || matchMedia('(pointer: coarse)').matches) return apply(next)
    document.startViewTransition(() => apply(next))
  }

  onMounted(() => {
    dark.value = document.documentElement.classList.contains('dark')
    wanted = dark.value
    const media = matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', (e) => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem('theme')
      }
      catch {
        stored = null
      }
      if (!stored || stored === 'system') {
        wanted = e.matches
        apply(e.matches)
      }
    })
  })

  return { dark, toggle }
}
