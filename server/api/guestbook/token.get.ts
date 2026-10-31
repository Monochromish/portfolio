import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  event.res.headers.set('cache-control', 'no-store')
  return { token: await issueFormToken(event) }
})
