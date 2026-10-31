import { createError, defineEventHandler, readBody } from 'nuxt/server'
import { isPlainObject, sameKeys } from '#shared/guestbook'
import type { ModerationSticker } from '#shared/types'

export default defineEventHandler(async (event): Promise<ModerationSticker> => {
  const via = await requireModerator(event)
  const id = stickerIdParam(event)
  const body = await readBody<unknown>(event)
  const fields = via === 'token' ? ['action', 'view'] : ['action']
  const action = isPlainObject(body) && sameKeys(body, fields) ? body.action : undefined
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null
  if (!status) {
    throw createError({ status: 400, statusText: via === 'token' ? 'Send exactly {"action":"approve" or "reject","view":"<the view token from GET /api/admin/guestbook/<id>>"}' : 'Send exactly {"action":"approve"} or {"action":"reject"}' })
  }
  if (via === 'token') await checkViewToken(event, id, (body as { view?: unknown }).view)
  const row = await decideSticker(id, status, via === 'token')
  if (!row) throw createError({ status: 404, statusText: via === 'token' ? `No pending sticker ${id}` : `No sticker ${id}` })
  const sticker = toModerationSticker(row)
  if (!sticker) throw createError({ status: 422, statusText: `Sticker ${id} was ${status}, but its drawing no longer passes the check` })
  return sticker
})
