import { createError } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

const USER_AGENT = 'himanshu.sh (+https://himanshu.sh)'

export function githubOAuthConfig(event: RequestEvent) {
  const { githubClientId, githubClientSecret } = serverConfig(event)
  if (!githubClientId || !githubClientSecret) {
    throw createError({ status: 503, statusText: 'NUXT_GITHUB_CLIENT_ID and NUXT_GITHUB_CLIENT_SECRET must be set' })
  }
  return { clientId: String(githubClientId), clientSecret: String(githubClientSecret) }
}

export function githubCallbackUrl(event: RequestEvent) {
  return `${requestOrigin(event)}/auth/github/callback`
}

export async function exchangeGithubCode(event: RequestEvent, code: string, verifier: string) {
  const { clientId, clientSecret } = githubOAuthConfig(event)
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'user-agent': USER_AGENT },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: githubCallbackUrl(event),
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(8000),
  })
  const result = await res.json() as { access_token?: string, error?: string }
  if (!res.ok || !result.access_token) throw createError({ status: 502, statusText: `GitHub token exchange failed: ${result.error ?? res.status}` })
  return result.access_token
}

export async function fetchGithubUser(token: string) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${token}`,
      'user-agent': USER_AGENT,
      'x-github-api-version': '2022-11-28',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw createError({ status: 502, statusText: `GitHub user lookup failed: ${res.status}` })
  return await res.json() as { id: number, login: string }
}
