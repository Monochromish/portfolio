import { createError, defineEventHandler, getQuery } from 'nuxt/server'
import type { GuestbookQueue, RoutineQueue } from '#shared/types'

const ID_RE = /^[1-9]\d{0,14}$/

export default defineEventHandler(async (event): Promise<GuestbookQueue | RoutineQueue> => {
  const via = await requireModerator(event)
  const { after } = getQuery(event)
  if (after !== undefined && (typeof after !== 'string' || !ID_RE.test(after))) throw createError({ status: 400, statusText: 'after must be a sticker id' })
  const queue = await moderationQueue(after === undefined ? 0 : Number(after), via === 'owner')
  return via === 'owner' ? queue : { next: queue.next, pending: queue.pending.map(({ id, template, createdAt }) => ({ id, template, createdAt })) }
})
