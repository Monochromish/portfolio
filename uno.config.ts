import { defineConfig, presetIcons, presetWind4 } from 'unocss'

const line = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const solid = (d: string, box = 24) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}"><path fill="currentColor" d="${d}"/></svg>`

export default defineConfig({
  // Uno ease utilities would overwrite --ease-out and --ease-in-out in main.css
  blocklist: [/^(?:transition-)?ease(?:-.+)?$/],
  presets: [
    presetWind4({ preflights: { reset: true } }),
    presetIcons({
      collections: {
        site: {
          'close': line('<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>'),
          'check': line('<path d="M4.8 10.4l3.3 3.3 7.1-7.4"/>'),
          'music': line('<path d="M4 8.5v3M7.3 6v8M10.6 4v12M13.9 6.8v6.4M17 9v2"/>'),
          'film': line('<rect x="3.5" y="4" width="13" height="12" rx="1.6"/><path d="M6.8 4v12M13.2 4v12M3.5 7.4h3.3M3.5 10h3.3M3.5 12.6h3.3M13.2 7.4h3.3M13.2 10h3.3M13.2 12.6h3.3"/>'),
          'star': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M10 2.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7Z"/></svg>',
          'star-half': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M10 2.6v12.8l-4.5 2.4.9-5L2.8 7.9l5-.7Z"/></svg>',
          'heart-fill': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M10 16.6s-6.6-3.8-6.6-8.8A3.7 3.7 0 0 1 10 5.6a3.7 3.7 0 0 1 6.6 2.2c0 5-6.6 8.8-6.6 8.8Z"/></svg>',
          'rewatch': line('<path d="M15.6 8.2A6 6 0 0 0 4.7 6.5M4.4 11.8a6 6 0 0 0 10.9 1.7M4.6 3.8v2.9h2.9M15.4 16.2v-2.9h-2.9"/>'),
          'send': line('<path d="M4 10h11M11 5.5L15.5 10 11 14.5"/>'),
          'arrow-left': line('<path d="M16 10H5M9 5.5L4.5 10 9 14.5"/>'),
          'log-out': line('<path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M12 6.5L15.5 10 12 13.5M15.5 10H8"/>'),
          'github': solid('M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'),
        },
      },
    }),
  ],
  theme: {
    font: {
      sans: '\'Figtree\', \'Figtree Fallback\', system-ui, sans-serif',
    },
  },
})
