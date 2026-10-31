import { createError } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import { GUESTBOOK_TURNSTILE_ACTION } from '#shared/guestbook'

interface SiteverifyOutcome {
  'success': boolean
  'hostname'?: string
  'action'?: string
  'error-codes'?: string[]
}

let warnedMissingSecret = false

export async function verifyTurnstile(event: RequestEvent, token: unknown, ip: string) {
  const secret = serverConfig(event).turnstileSecretKey
  const hostname = new URL(requestOrigin(event)).hostname
  if (!secret) {
    if (!isLocalHostname(hostname)) throw createError({ status: 503, statusText: 'Turnstile is not configured, set NUXT_TURNSTILE_SECRET_KEY' })
    if (!warnedMissingSecret) console.warn('[guestbook] NUXT_TURNSTILE_SECRET_KEY is not set, so Turnstile is skipped for localhost requests')
    warnedMissingSecret = true
    return
  }
  if (typeof token !== 'string' || !token || token.length > 2048) throw guestbookError(400, 'turnstile', 'Complete the challenge and try again')
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: String(secret), response: token, remoteip: ip }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw createError({ status: 502, statusText: `Turnstile siteverify answered ${res.status}` })
  const outcome = await res.json() as SiteverifyOutcome
  if (!outcome.success) {
    throw guestbookError(403, 'turnstile', `Challenge failed (${outcome['error-codes']?.join(', ') || 'no reason given'})`)
  }
  if (outcome.hostname !== hostname || outcome.action !== GUESTBOOK_TURNSTILE_ACTION) {
    throw guestbookError(403, 'turnstile', 'Challenge was solved for a different page')
  }
}
