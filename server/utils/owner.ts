import { clearSession, createError, getCookie, useSession } from 'nuxt/server'
import type { RequestEvent, SessionConfig } from 'nuxt/server'

export type OwnerSession = {
  githubId?: number
  login?: string
}

export type OAuthAttempt = {
  state?: string
  verifier?: string
}

const OWNER_COOKIE = 'hs-owner'
const OWNER_MAX_AGE_S = 7 * 24 * 60 * 60
const OAUTH_COOKIE = 'hs-oauth'
const OAUTH_MAX_AGE_S = 10 * 60

export async function ownerSessionConfig(event: RequestEvent): Promise<SessionConfig> {
  return { name: OWNER_COOKIE, password: await appSecretPassword(event, 'session:owner'), maxAge: OWNER_MAX_AGE_S }
}

export async function oauthSessionConfig(event: RequestEvent): Promise<SessionConfig> {
  return {
    name: OAUTH_COOKIE,
    password: await appSecretPassword(event, 'session:oauth'),
    maxAge: OAUTH_MAX_AGE_S,
    cookie: { path: '/auth/github' },
  }
}

export function clearOwnerSession(event: RequestEvent) {
  return clearSession(event, { name: OWNER_COOKIE })
}

export function requireOwnerGithubId(event: RequestEvent) {
  const id = String(serverConfig(event).ownerGithubId ?? '')
  if (!/^\d+$/.test(id)) throw createError({ status: 503, statusText: 'NUXT_OWNER_GITHUB_ID must be set to your numeric GitHub user id' })
  return id
}

export async function requireOwner(event: RequestEvent) {
  event.res.headers.set('cache-control', 'no-store')
  if (event.req.method !== 'GET' && event.req.method !== 'HEAD') assertSameOrigin(event)
  const ownerId = requireOwnerGithubId(event)
  if (!getCookie(event, OWNER_COOKIE)) {
    githubOAuthConfig(event)
    throw createError({ status: 401, statusText: 'Sign in at /auth/github first' })
  }
  const session = await useSession<OwnerSession>(event, await ownerSessionConfig(event))
  if (String(session.data.githubId) !== ownerId) {
    await clearOwnerSession(event)
    throw createError({ status: 401, statusText: 'Sign in at /auth/github first' })
  }
  return session.data
}
