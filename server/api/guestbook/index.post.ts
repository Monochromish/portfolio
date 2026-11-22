import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import type { GuestbookReceipt } from '#shared/types'

export default defineEventHandler(async (event): Promise<GuestbookReceipt> => {
  event.res.headers.set('cache-control', 'no-store')
  assertSameOrigin(event)
  await checkOnePerVisitor(event)
  const submission = checkSubmission(await readStickerJson(event))
  await checkFormToken(event, submission.formToken)
  const ip = clientAddress(event)
  const hashes = await hashClientAddress(event, ip)
  const asn = clientAsn(event)
  await checkBurstLimit(event, hashes.visitor[0])
  await checkDailyCap(hashes)
  await checkQueue(asn)
  await verifyTurnstile(event, submission.turnstileToken, ip)
  const country = submission.shareCountry ? visitorCountry(event) : null
  const place = await settledPlace(submission.template, submission)
  const { id, created } = await insertPendingSticker(submission.template, submission.strokes, place, country, hashes, asn)
  await rememberSticker(event, id, created)
  announceSticker(event, id, submission.template, country)
  setResponseStatus(event, 201)
  return { status: 'pending', id, country, x: place.x, y: place.y }
})
