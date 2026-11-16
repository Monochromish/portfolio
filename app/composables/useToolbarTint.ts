// --paper from main.css as sRGB hex, since not every browser reads OKLCH in a theme-color tag
const PAPER = { light: '#f8f7fa', dark: '#050506' }

export function useToolbarTint() {
  const dark = useState<boolean>('dark', () => false)
  const hydrated = ref(false)

  useHead(() => {
    const pick = (scheme: 'light' | 'dark') => PAPER[hydrated.value ? (dark.value ? 'dark' : 'light') : scheme]
    return {
      meta: [
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: pick('light') },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: pick('dark') },
      ],
    }
  })

  onMounted(() => {
    hydrated.value = true
  })
}
