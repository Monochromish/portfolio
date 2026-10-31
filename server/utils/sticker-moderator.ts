import { createError, getRequestHeader } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

const BEARER_RE = /^Bearer +([\x21-\x7E]{1,512})$/i
const TOKEN_MIN_LENGTH = 32

async function sameSecret(given: string, expected: string) {
  const [a, b] = await Promise.all([given, expected].map(async text => new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(text)))))
  let diff = 0
  for (let i = 0; i < a!.length; i++) diff |= a![i]! ^ b![i]!
  return diff === 0
}

export async function requireModerator(event: RequestEvent): Promise<'token' | 'owner'> {
  event.res.headers.set('cache-control', 'no-store')
  const header = getRequestHeader(event, 'authorization')
  if (header === undefined) {
    await requireOwner(event)
    return 'owner'
  }
  const expected = String(serverConfig(event).moderatorToken ?? '')
  if (!expected) throw createError({ status: 503, statusText: 'Token moderation is off, set NUXT_MODERATOR_TOKEN to turn it on' })
  if (expected.length < TOKEN_MIN_LENGTH) throw createError({ status: 500, statusText: `NUXT_MODERATOR_TOKEN must be at least ${TOKEN_MIN_LENGTH} characters` })
  const given = BEARER_RE.exec(header)?.[1]
  if (!given) throw createError({ status: 401, statusText: 'Send the token as an Authorization: Bearer header' })
  if (!await sameSecret(given, expected)) throw createError({ status: 401, statusText: 'Wrong moderator token' })
  return 'token'
}
