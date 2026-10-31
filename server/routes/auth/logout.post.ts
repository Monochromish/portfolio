import { defineEventHandler, setResponseStatus } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  event.res.headers.set('cache-control', 'no-store')
  assertSameOrigin(event)
  await clearOwnerSession(event)
  setResponseStatus(event, 204)
  return null
})
