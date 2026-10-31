import { createError } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

const encoder = new TextEncoder()

export const utf8 = (text: string) => encoder.encode(text)

export function concatBytes(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeBase64Url(text: string) {
  const plain = text.replace(/=+$/, '')
  if (!plain || !/^[\w+/-]+$/.test(plain) || plain.length % 4 === 1) return null
  return Uint8Array.from(atob(plain.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0))
}

export function randomToken() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export function sameText(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function appSecret(event: RequestEvent) {
  const { appSecret } = serverConfig(event)
  if (typeof appSecret !== 'string' || appSecret.length < 32) {
    throw createError({ status: 500, statusText: 'NUXT_APP_SECRET must be set to at least 32 characters' })
  }
  return appSecret
}

async function deriveBytes(event: RequestEvent, purpose: string) {
  const root = await crypto.subtle.importKey('raw', utf8(appSecret(event)), 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: utf8('himanshu.sh'), info: utf8(purpose) }, root, 256)
  return new Uint8Array(bits)
}

export async function appSecretKey(event: RequestEvent, purpose: string) {
  return crypto.subtle.importKey('raw', await deriveBytes(event, purpose), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function appSecretPassword(event: RequestEvent, purpose: string) {
  return [...await deriveBytes(event, purpose)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
