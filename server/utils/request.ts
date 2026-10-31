import { createError, getRequestHeader } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import type { H3Event } from 'h3'

export interface CloudflareContext {
  env: Record<string, unknown>
  url: URL
}

export function serverConfig(event: RequestEvent) {
  return useRuntimeConfig(event as unknown as H3Event)
}

export function cloudflareContext(event: RequestEvent) {
  return event.context.cloudflare as CloudflareContext | undefined
}

export function clientAsn(event: RequestEvent) {
  if (!cloudflareContext(event)) return null
  const asn = (event.context.cf as { asn?: unknown } | undefined)?.asn
  // 0: Cloudflare named no provider; those visitors share one provider cap
  return typeof asn === 'number' && Number.isSafeInteger(asn) && asn > 0 ? asn : 0
}

export function requestOrigin(event: RequestEvent) {
  return (cloudflareContext(event)?.url ?? event.url).origin
}

// XX is Cloudflare's unknown country and T1 is Tor
export function visitorCountry(event: RequestEvent) {
  const code = (event.context.cf as { country?: unknown } | undefined)?.country
  return typeof code === 'string' && /^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'T1' ? code : null
}

export function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function assertSameOrigin(event: RequestEvent) {
  const origin = getRequestHeader(event, 'origin')
  if (origin && origin !== requestOrigin(event)) throw createError({ status: 403, statusText: 'Cross-origin request refused' })
}
