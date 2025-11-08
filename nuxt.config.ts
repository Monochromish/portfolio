// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', "@nuxt/icon", "@nuxtjs/google-fonts"],
  app: {
      head: {
          title: "Himanshu Adwani - Portfolio",
          htmlAttrs: { lang: "en" },
          meta: [
              { name: "description", content: "Freelance Software Dev • Computer Science Sophomore, Penn State" },
              { name: "viewport", content: "width=device-width, initial-scale=1" }
          ],
          link: [
              { rel: "icon", type: 'image/png', href: "https://avatars.githubusercontent.com/u/79590499?v=4" },
          ]
      }
  },
  googleFonts: {
      families: {
          'IBM+Plex+Sans': [400, 600, 700],
      },
      display: 'swap',
      preload: true,
  },
  css: ['~/assets/css/main.css'],
})