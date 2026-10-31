import { createError, defineEventHandler } from 'nuxt/server'
import type { StickerView } from '#shared/types'

export default defineEventHandler(async (event): Promise<StickerView> => {
  const via = await requireModerator(event)
  const id = stickerIdParam(event)
  const row = await findSticker(id)
  if (!row || (via === 'token' && row.status !== 'pending')) throw createError({ status: 404, statusText: via === 'token' ? `No pending sticker ${id}` : `No sticker ${id}` })
  const sticker = toSticker(row)
  if (!sticker) throw createError({ status: 422, statusText: `Sticker ${id} no longer passes the drawing check` })
  return { id, template: sticker.template, status: row.status, createdAt: sticker.createdAt, svg: stickerSvg(sticker), view: await stickerViewToken(event, id) }
})
