import { createError, getCookie, getRequestHeader, getRequestIP, getRouterParam, setCookie } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import { MAX_BODY_BYTES, STICKER_TEMPLATES, isPlainObject, stickerProblem, stickerTemplate } from '#shared/guestbook'
import type { GuestbookQueue, GuestbookRejection, GuestbookStatus, ModerationSticker, Placement, Sticker, StickerPage, StickerStroke } from '#shared/types'

const FORM_TOKEN_RE = /^(\d{13})\.([\w-]{43})$/
const FORM_MIN_AGE_MS = 3_000
const FORM_MAX_AGE_MS = 60 * 60 * 1000
const DAILY_CAP = 1
const NETWORK_DAILY_CAP = 3
const DAY_MS = 24 * 60 * 60 * 1000
const FIRST_PAGE_TTL_MS = 60_000
const QUEUE_CAP = 100
const PROVIDER_QUEUE_CAP = 25
// ink points a page allows per sticker it can hold
const PAGE_POINTS = 750
const VIEW_MAX_AGE_MS = 15 * 60 * 1000
const VIEW_RE = /^(\d{13})\.([\w-]{43})$/
const QUEUE_PAGE = 12
const LEFT_COOKIE = 'hs-sticker'
// 400 days: the longest browsers keep a cookie
const LEFT_MAX_AGE_S = 400 * 24 * 60 * 60
const LEFT_RE = /^(\d{1,15})\.(\d{1,12})\.([\w-]{43})$/
const RECENT_MAX = 30
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/
const IPV4_MAPPED_RE = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i
const HEX_GROUP_RE = /^[\da-f]{1,4}$/i
const REQUIRED_FIELDS = ['template', 'strokes', 'x', 'y', 'rot', 'shareCountry', 'website', 'formToken']
const FIELDS = new Set([...REQUIRED_FIELDS, 'turnstileToken'])
// the tilt a sticker can be stuck at, either way, in degrees
const MAX_TILT = 30

export interface StickerRow {
  id: number
  template: string
  strokes: string
  status: GuestbookStatus
  created_at: number
  decided_at: number | null
  x: number | null
  y: number | null
  rot: number | null
  country: string | null
}

interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

export interface AddressHashes {
  visitor: [today: string, yesterday: string]
  network: [today: string, yesterday: string]
}

export function guestbookError(status: number, reason: GuestbookRejection, message: string) {
  return createError({ status, statusText: message, data: { reason } })
}

const formTokenData = (event: RequestEvent, issuedAt: string) => utf8(`${issuedAt}:${networkKey(clientAddress(event))}`)

export async function issueFormToken(event: RequestEvent) {
  const issuedAt = String(Date.now())
  const signature = await crypto.subtle.sign('HMAC', await appSecretKey(event, 'guestbook-form'), formTokenData(event, issuedAt))
  return `${issuedAt}.${toBase64Url(signature)}`
}

export async function checkFormToken(event: RequestEvent, token: string) {
  const [, issuedAt = '', signature = ''] = FORM_TOKEN_RE.exec(token) || []
  const signatureBytes = decodeBase64Url(signature)
  const key = await appSecretKey(event, 'guestbook-form')
  if (!issuedAt || !signatureBytes || !await crypto.subtle.verify('HMAC', key, signatureBytes, formTokenData(event, issuedAt))) {
    throw guestbookError(400, 'form-token', 'Invalid form token, reload the page and try again')
  }
  const age = Date.now() - Number(issuedAt)
  if (age < FORM_MIN_AGE_MS) throw guestbookError(400, 'too-fast', 'Sent too quickly, wait a moment and try again')
  if (age > FORM_MAX_AGE_MS) throw guestbookError(400, 'form-expired', 'This form expired, reload the page and try again')
}

export function clientAddress(event: RequestEvent) {
  const ip = cloudflareContext(event) ? getRequestHeader(event, 'cf-connecting-ip') : getRequestIP(event)
  if (!ip && import.meta.dev) return '127.0.0.1'
  if (!ip) throw createError({ status: 400, statusText: 'Client address unavailable' })
  return ip
}

const unavailable = () => createError({ status: 400, statusText: 'Client address unavailable' })

function ipv4(ip: string) {
  const v4 = IPV4_MAPPED_RE.exec(ip)?.[1] ?? (ip.includes(':') ? null : ip)
  if (v4 !== null && !IPV4_RE.test(v4)) throw unavailable()
  return v4
}

function ipv6Prefix(ip: string, count: number) {
  const [head = '', tail] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = tail === undefined ? left : [...left, ...Array.from({ length: 8 - left.length - right.length }, () => '0'), ...right]
  const prefix = groups.slice(0, count)
  if (prefix.length < count || !prefix.every(group => HEX_GROUP_RE.test(group))) throw unavailable()
  return prefix.map(group => Number.parseInt(group, 16).toString(16)).join(':')
}

function visitorKey(ip: string) {
  return ipv4(ip) ?? `${ipv6Prefix(ip, 4)}::/64`
}

function networkKey(ip: string) {
  const v4 = ipv4(ip)
  return v4 ? `${v4.slice(0, v4.lastIndexOf('.'))}.0/24` : `${ipv6Prefix(ip, 3)}::/48`
}

export async function hashClientAddress(event: RequestEvent, ip: string): Promise<AddressHashes> {
  const key = await appSecretKey(event, 'guestbook-ip')
  const now = Date.now()
  const salts = await Promise.all([now, now - DAY_MS].map(t => crypto.subtle.sign('HMAC', key, utf8(new Date(t).toISOString().slice(0, 10)))))
  const hashed = async (value: string): Promise<[string, string]> => {
    const [today, yesterday] = await Promise.all(salts.map(async salt => toBase64Url(await crypto.subtle.digest('SHA-256', concatBytes(new Uint8Array(salt), utf8(value))))))
    return [today!, yesterday!]
  }
  return { visitor: await hashed(visitorKey(ip)), network: await hashed(networkKey(ip)) }
}

export async function checkBurstLimit(event: RequestEvent, key: string) {
  const cloudflare = cloudflareContext(event)
  if (!cloudflare) return
  const limiter = cloudflare.env.GUESTBOOK_RL as RateLimiter | undefined
  if (!limiter) throw createError({ status: 500, statusText: 'GUESTBOOK_RL binding is missing from the Worker' })
  const { success } = await limiter.limit({ key })
  if (!success) throw guestbookError(429, 'rate-limited', 'Too many stickers, try again in a minute')
}

const dailyCapError = () => guestbookError(429, 'daily-cap', 'A sticker was already left from this network today')
const bookFull = () => guestbookError(503, 'book-full', 'The book is full for now')
const tooLarge = () => guestbookError(413, 'too-large', `A sticker must be at most ${MAX_BODY_BYTES} bytes`)

export async function checkDailyCap({ visitor, network }: AddressHashes) {
  const { rows } = await useDatabase().sql<{ rows: { visitor: number, network: number }[] }>`SELECT
    (SELECT count(*) FROM stickers WHERE ip_hash IN (${visitor[0]}, ${visitor[1]}) AND created_at > unixepoch() - 86400) AS visitor,
    (SELECT count(*) FROM stickers WHERE net_hash IN (${network[0]}, ${network[1]}) AND created_at > unixepoch() - 86400) AS network`
  if (rows[0]!.visitor >= DAILY_CAP || rows[0]!.network >= NETWORK_DAILY_CAP) throw dailyCapError()
}

export async function checkQueue(asn: number | null) {
  const { rows } = await useDatabase().sql<{ rows: { n: number, provider: number }[] }>`SELECT count(*) AS n,
    count(CASE WHEN asn = ${asn} THEN 1 END) AS provider FROM stickers WHERE status = 'pending'`
  if (rows[0]!.n >= QUEUE_CAP || rows[0]!.provider >= PROVIDER_QUEUE_CAP) throw bookFull()
}

async function leftCookieValue(event: RequestEvent, id: number, created: number) {
  const signature = await crypto.subtle.sign('HMAC', await appSecretKey(event, 'guestbook-left'), utf8(`${id}:${created}`))
  return `${id}.${created}.${toBase64Url(signature)}`
}

async function readLeftCookie(event: RequestEvent, value: string) {
  const [, id = '', created = '', signature = ''] = LEFT_RE.exec(value) || []
  const bytes = decodeBase64Url(signature)
  if (!id || !bytes || !await crypto.subtle.verify('HMAC', await appSecretKey(event, 'guestbook-left'), bytes, utf8(`${id}:${created}`))) return null
  return { id: Number(id), created: Number(created) }
}

export const leftSticker = (event: RequestEvent) => readLeftCookie(event, getCookie(event, LEFT_COOKIE) ?? '')

export async function checkOnePerVisitor(event: RequestEvent) {
  if (await leftSticker(event) !== null) {
    throw guestbookError(409, 'one-per-visitor', 'A sticker was already left from this browser')
  }
}

export async function rememberSticker(event: RequestEvent, id: number, created: number) {
  setCookie(event, LEFT_COOKIE, await leftCookieValue(event, id, created), {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: LEFT_MAX_AGE_S,
  })
}

export async function readStickerJson(event: RequestEvent): Promise<unknown> {
  if (Number(getRequestHeader(event, 'content-length') ?? 0) > MAX_BODY_BYTES) throw tooLarge()
  if (!/^application\/json\s*(?:;|$)/i.test(getRequestHeader(event, 'content-type') ?? '')) {
    throw guestbookError(415, 'bad-request', 'Send the sticker as application/json')
  }
  const reader = event.req.body?.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (reader) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      throw tooLarge()
    }
    chunks.push(value)
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(concatBytes(...chunks)))
  }
  catch {
    throw guestbookError(400, 'bad-request', 'The body is not valid JSON')
  }
}

export interface CheckedSubmission extends Placement {
  template: string
  strokes: StickerStroke[]
  shareCountry: boolean
  formToken: string
  turnstileToken?: string
}

const badRequest = (message: string) => guestbookError(400, 'bad-request', message)

export function checkSubmission(value: unknown): CheckedSubmission {
  if (!isPlainObject(value)) throw badRequest('The body must be a JSON object')
  for (const key of Object.keys(value)) {
    if (!FIELDS.has(key)) throw badRequest(`Unknown field "${key.replace(/[^\w-]/g, '').slice(0, 32)}"`)
  }
  for (const key of REQUIRED_FIELDS) {
    if (!Object.hasOwn(value, key)) throw badRequest(`Missing field "${key}"`)
  }
  const { template, strokes, x, y, rot, shareCountry, website, formToken, turnstileToken } = value
  const within = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi
  if (!within(x, 0, 1) || !within(y, 0, 1)) throw badRequest('x and y must be numbers from 0 to 1')
  if (!within(rot, -MAX_TILT, MAX_TILT)) throw badRequest(`rot must be a number from -${MAX_TILT} to ${MAX_TILT}`)
  if (typeof shareCountry !== 'boolean') throw badRequest('shareCountry must be true or false')
  if (typeof website !== 'string' || typeof formToken !== 'string' || (turnstileToken !== undefined && typeof turnstileToken !== 'string')) {
    throw badRequest('website, formToken and turnstileToken must be strings')
  }
  if (website) throw guestbookError(400, 'honeypot', 'Submission rejected')
  const t = typeof template === 'string' ? stickerTemplate(template) : undefined
  if (!t) throw guestbookError(400, 'invalid-sticker', `template must be one of ${STICKER_TEMPLATES.map(s => s.id).join(', ')}`)
  const problem = stickerProblem(t, strokes)
  if (problem) throw guestbookError(400, 'invalid-sticker', problem)
  return { template: t.id, strokes: strokes as StickerStroke[], x: x as number, y: y as number, rot: rot as number, shareCountry, formToken, turnstileToken }
}

const storedStrokes = (strokes: readonly StickerStroke[]) => JSON.stringify(strokes.map(s => [s.color, s.size, s.points]))

export async function insertPendingSticker(template: string, strokes: readonly StickerStroke[], { x, y, rot }: Placement, country: string | null, { visitor, network }: AddressHashes, asn: number | null) {
  const { rows } = await useDatabase().sql<{ rows: { id: number, created_at: number }[] }>`INSERT INTO stickers (template, strokes, ip_hash, net_hash, asn, x, y, rot, country)
    SELECT ${template}, ${storedStrokes(strokes)}, ${visitor[0]}, ${network[0]}, ${asn}, ${x}, ${y}, ${rot}, ${country}
    WHERE (SELECT count(*) FROM stickers WHERE ip_hash IN (${visitor[0]}, ${visitor[1]}) AND created_at > unixepoch() - 86400) < ${DAILY_CAP}
      AND (SELECT count(*) FROM stickers WHERE net_hash IN (${network[0]}, ${network[1]}) AND created_at > unixepoch() - 86400) < ${NETWORK_DAILY_CAP}
      AND (SELECT count(*) FROM stickers WHERE status = 'pending') < ${QUEUE_CAP}
      AND (SELECT count(*) FROM stickers WHERE status = 'pending' AND asn = ${asn}) < ${PROVIDER_QUEUE_CAP}
    RETURNING id, created_at`
  if (!rows[0]) {
    await checkDailyCap({ visitor, network })
    throw bookFull()
  }
  return { id: rows[0].id, created: rows[0].created_at }
}

export function toSticker(row: StickerRow): Sticker | null {
  const t = stickerTemplate(row.template)
  let stored: unknown
  try {
    stored = JSON.parse(row.strokes)
  }
  catch {
    stored = null
  }
  const strokes = Array.isArray(stored)
    ? stored.map(s => Array.isArray(s) && s.length === 3 ? { color: s[0], size: s[1], points: s[2] } : s)
    : stored
  const problem = t ? stickerProblem(t, strokes) : 'unknown template'
  if (problem) {
    console.warn(`[guestbook] sticker ${row.id} is left out: ${problem}`)
    return null
  }
  // stickers from before the board get a steady spot from their id
  const spot = (n: number) => 0.12 + 0.76 * ((row.id * n) % 1)
  return {
    id: row.id,
    template: t!.id,
    strokes: strokes as StickerStroke[],
    createdAt: row.created_at * 1000,
    x: row.x ?? spot(0.618),
    y: row.y ?? spot(0.382),
    rot: row.rot ?? 0,
    country: row.country,
  }
}

export function toModerationSticker(row: StickerRow): ModerationSticker | null {
  const sticker = toSticker(row)
  return sticker && { ...sticker, status: row.status, decidedAt: row.decided_at === null ? null : row.decided_at * 1000 }
}

export async function stickerViewToken(event: RequestEvent, id: number) {
  const issuedAt = String(Date.now())
  const signature = await crypto.subtle.sign('HMAC', await appSecretKey(event, 'guestbook-view'), utf8(`${id}:${issuedAt}`))
  return `${issuedAt}.${toBase64Url(signature)}`
}

export async function checkViewToken(event: RequestEvent, id: number, token: unknown) {
  const [, issuedAt = '', signature = ''] = (typeof token === 'string' && VIEW_RE.exec(token)) || []
  const bytes = decodeBase64Url(signature)
  const fresh = !!issuedAt && Date.now() - Number(issuedAt) < VIEW_MAX_AGE_MS
  if (!fresh || !bytes || !await crypto.subtle.verify('HMAC', await appSecretKey(event, 'guestbook-view'), bytes, utf8(`${id}:${issuedAt}`))) {
    throw createError({ status: 400, statusText: `Fetch sticker ${id} again and send the view token from that reply` })
  }
}

const present = <T>(value: T | null): value is T => value !== null

const firstPages = new Map<number, { at: number, page: StickerPage }>()
let approvedCount: { at: number, n: number } | null = null

export async function listApprovedStickers(before: number | undefined, limit: number): Promise<StickerPage> {
  const cached = before === undefined ? firstPages.get(limit) : undefined
  if (cached && Date.now() - cached.at < FIRST_PAGE_TTL_MS) return cached.page
  const db = useDatabase()
  const { rows } = await db.sql<{ rows: StickerRow[] }>`SELECT id, template, strokes, status, created_at, decided_at, x, y, rot, country FROM stickers
    WHERE status = 'approved' AND id < ${before ?? Number.MAX_SAFE_INTEGER} ORDER BY id DESC LIMIT ${limit + 1}`
  const stickers: Sticker[] = []
  let taken = 0
  let points = 0
  for (; taken < Math.min(rows.length, limit); taken++) {
    const sticker = toSticker(rows[taken]!)
    const ink = sticker ? sticker.strokes.reduce((n, s) => n + s.points.length / 3, 0) : 0
    if (stickers.length && points + ink > limit * PAGE_POINTS) break
    if (sticker) stickers.push(sticker)
    points += ink
  }
  const page: StickerPage = { stickers, next: taken < rows.length ? rows[taken - 1]!.id : null }
  if (before === undefined) {
    if (!approvedCount || Date.now() - approvedCount.at >= FIRST_PAGE_TTL_MS) {
      const { rows: counted } = await db.sql<{ rows: { n: number }[] }>`SELECT count(*) AS n FROM stickers WHERE status = 'approved'`
      approvedCount = { at: Date.now(), n: counted[0]!.n }
    }
    page.total = approvedCount.n
    firstPages.set(limit, { at: Date.now(), page })
  }
  return page
}

export function forgetApprovedStickers() {
  firstPages.clear()
  approvedCount = null
}

export async function moderationQueue(after: number, withRecent: boolean): Promise<GuestbookQueue> {
  const db = useDatabase()
  const { rows } = await db.sql<{ rows: StickerRow[] }>`SELECT id, template, strokes, status, created_at, decided_at, x, y, rot, country FROM stickers
    WHERE status = 'pending' AND id > ${after} ORDER BY id LIMIT ${QUEUE_PAGE + 1}`
  const page = rows.slice(0, QUEUE_PAGE)
  const recent = withRecent
    ? (await db.sql<{ rows: StickerRow[] }>`SELECT id, template, strokes, status, created_at, decided_at, x, y, rot, country FROM stickers
        WHERE status != 'pending' ORDER BY decided_at DESC, id DESC LIMIT ${RECENT_MAX}`).rows
    : []
  return {
    pending: page.map(row => toModerationSticker(row)).filter(present),
    next: rows.length > QUEUE_PAGE ? page[page.length - 1]!.id : null,
    recent: recent.map(row => toModerationSticker(row)).filter(present),
  }
}

export async function findSticker(id: number) {
  const { rows } = await useDatabase().sql<{ rows: StickerRow[] }>`SELECT id, template, strokes, status, created_at, decided_at, x, y, rot, country FROM stickers WHERE id = ${id}`
  return rows[0]
}

export async function pendingSticker({ id, created }: { id: number, created: number }) {
  const row = await findSticker(id)
  const fresh = Date.now() / 1000 - created < DAY_MS / 1000
  return fresh && row?.status === 'pending' && row.created_at === created ? toSticker(row) : null
}

export async function decideSticker(id: number, status: 'approved' | 'rejected', pendingOnly: boolean) {
  const db = useDatabase()
  const { rows } = pendingOnly
    ? await db.sql<{ rows: StickerRow[] }>`UPDATE stickers SET status = ${status}, decided_at = unixepoch() WHERE id = ${id} AND status = 'pending'
      RETURNING id, template, strokes, status, created_at, decided_at`
    : await db.sql<{ rows: StickerRow[] }>`UPDATE stickers SET status = ${status}, decided_at = unixepoch() WHERE id = ${id}
      RETURNING id, template, strokes, status, created_at, decided_at`
  forgetApprovedStickers()
  return rows[0]
}

export function stickerIdParam(event: RequestEvent) {
  const param = getRouterParam(event, 'id') ?? ''
  const id = Number(param)
  if (!/^[1-9]\d*$/.test(param) || !Number.isSafeInteger(id)) throw createError({ status: 400, statusText: 'Sticker id must be a positive integer' })
  return id
}
