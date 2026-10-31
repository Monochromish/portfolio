import { defineEventHandler } from 'nuxt/server'
import type { OwnSticker } from '#shared/types'

export default defineEventHandler(async (event): Promise<OwnSticker> => {
  event.res.headers.set('cache-control', 'private, no-store')
  const left = await leftSticker(event)
  return left === null ? { left: false, sticker: null } : { left: true, sticker: await pendingSticker(left) }
})
