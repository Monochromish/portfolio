import { execSync } from 'node:child_process'

function commit() {
  const named = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA
  if (named) return named
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  }
  catch {
    return ''
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@unocss/nuxt'],
  devtools: { enabled: false },
  runtimeConfig: {
    lastfmApiKey: '',
    lastfmUser: 'Monochromish',
    letterboxdUser: 'monochromish',
    turnstileSecretKey: '',
    githubClientId: '',
    githubClientSecret: '',
    ownerGithubId: '',
    appSecret: '',
    moderatorToken: '',
    public: {
      siteUrl: 'https://himanshu.sh',
      turnstileSiteKey: '',
      commit: commit(),
    },
  },
  routeRules: {
    '/**': { headers: { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/work/**': { headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' } },
    '/icon.svg': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/icon-32.jpg': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/icon-192.jpg': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/apple-touch-icon.jpg': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/og.png': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/og-monochromish.png': { headers: { 'cache-control': 'public, max-age=86400' } },
    '/Himanshu_Adwani_Resume.pdf': { headers: { 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } },
    '/': { headers: { 'cache-control': 'private, no-cache', 'vary': 'cookie' } },
    '/stickers': { headers: { 'cache-control': 'private, no-cache', 'vary': 'cookie' } },
    '/guestbook': { redirect: { to: '/stickers', statusCode: 301 } },
    '/resume.pdf': { redirect: { to: '/Himanshu_Adwani_Resume.pdf', statusCode: 301 } },
  },
  nitro: {
    experimental: { database: true },
    database: { default: { connector: 'node-sqlite', options: { name: 'db' } } },
    devDatabase: { default: { connector: 'node-sqlite', options: { name: 'dev' } } },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'himanshu-sh',
        d1_databases: [{ binding: 'DB', database_name: 'himanshu', database_id: process.env.NUXT_D1_DATABASE_ID }],
        // @ts-expect-error Nitro's bundled Wrangler types predate the rate-limit binding; wrangler.json gets it as written
        ratelimits: [{ name: 'GUESTBOOK_RL', namespace_id: '1001', simple: { limit: 3, period: 60 } }],
        observability: { enabled: true },
      },
    },
    hooks: {
      'build:before'(nitro) {
        if (nitro.options.dev || !nitro.options.preset.startsWith('cloudflare')) return
        if (!process.env.NUXT_D1_DATABASE_ID) throw new Error('NUXT_D1_DATABASE_ID must be set to the D1 database id for a Cloudflare build')
        nitro.options.database.default = { connector: 'cloudflare-d1', options: { bindingName: 'DB' } }
      },
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      title: 'Himanshu Adwani',
      meta: [
        { name: 'description', content: 'Himanshu Adwani (Isaiah), Senior Lead Developer at Cider and Computer Science student at Penn State, looking for a Summer 2027 software engineering internship.' },
      ],
      link: [
        { rel: 'preload', href: '/fonts/figtree.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'icon', type: 'image/jpeg', sizes: '32x32', href: '/icon-32.jpg' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.jpg' },
      ],
      script: [
        {
          innerHTML: `(function(){var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)').matches,t=null;try{t=localStorage.getItem('theme')}catch(e){t=null}if(t==='dark'||(t!=='light'&&m))d.classList.add('dark')})()`,
          tagPosition: 'head',
        },
      ],
    },
  },
})
