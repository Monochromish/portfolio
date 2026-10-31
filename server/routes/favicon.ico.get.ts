import { defineEventHandler, sendRedirect } from 'nuxt/server'

export default defineEventHandler((event) => {
  event.res.headers.set('cache-control', 'public, max-age=86400')
  return sendRedirect(event, '/icon-32.jpg', 302)
})
