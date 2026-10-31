// paper mirrors --paper in main.css; lagoon is the top-edge water the lagoon reports on a phone
const TINTS = {
  lagoon: { light: '#b4e5db', dark: '#0b1f2c' },
  paper: { light: '#f6f8f7', dark: '#081419' },
}

export const useToolbarSurface = () => useState<keyof typeof TINTS>('toolbar-surface', () => 'paper')
export const useLagoonTop = () => useState<{ light?: string, dark?: string }>('lagoon-top', () => ({}))

export function useToolbarTint() {
  const surface = useToolbarSurface()
  const top = useLagoonTop()
  const dark = useState<boolean>('dark', () => false)
  const hydrated = ref(false)

  useHead(() => {
    const tint = surface.value === 'lagoon' ? { ...TINTS.lagoon, ...top.value } : TINTS.paper
    const pick = (scheme: 'light' | 'dark') => tint[hydrated.value ? (dark.value ? 'dark' : 'light') : scheme]
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
