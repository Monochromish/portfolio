import { defineEventHandler, getQuery } from 'nuxt/server'
import type { StickerPage } from '#shared/types'

const PAGE_MAX = 24
const ID_RE = /^[1-9]\d{0,14}$/

export default defineEventHandler(async (event): Promise<StickerPage> => {
  const { before, limit } = getQuery(event)
  if (before !== undefined && (typeof before !== 'string' || !ID_RE.test(before))) throw guestbookError(400, 'bad-request', 'before must be a sticker id')
  const size = limit === undefined ? PAGE_MAX : typeof limit === 'string' && /^\d{1,2}$/.test(limit) ? Number(limit) : 0
  if (size < 1 || size > PAGE_MAX) throw guestbookError(400, 'bad-request', `limit must be 1 to ${PAGE_MAX}`)
  const page = await listApprovedStickers(before === undefined ? undefined : Number(before), size)
  event.res.headers.set('cache-control', 'public, max-age=30')
  return page
})
