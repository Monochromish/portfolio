// loose stickers need room around the words: a screen this wide has it, and a narrower one keeps them on a board
const ROOMY = '(min-width: 901px)'

// undefined until the page is in a browser, where the screen's width is known
export function useRoomy() {
  const roomy = ref<boolean>()
  let query: MediaQueryList | undefined
  const read = () => {
    roomy.value = query?.matches
  }

  onMounted(() => {
    query = matchMedia(ROOMY)
    read()
    query.addEventListener('change', read)
  })

  onBeforeUnmount(() => query?.removeEventListener('change', read))

  return roomy
}
